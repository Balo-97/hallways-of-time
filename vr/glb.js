/**
 * Read a binary glTF of the plain kind the museum's own scripts write
 * (scripts/make-webb.mjs): meshes of positions, normals and indices, each with
 * one metallic-roughness material and no textures. That is all the models in
 * the interactive museum need, so this stands in for three's GLTFLoader and
 * keeps the museum to the one vendored copy of three.
 *
 * Answers the scene as a group, with the file's scene extras on its userData.
 */
export async function loadGLB(THREE, url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url} could not be loaded (${response.status})`);
  const data = await response.arrayBuffer(), view = new DataView(data);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error(`${url} is not a binary glTF`);
  const jsonLength = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(data, 20, jsonLength)));
  const binStart = 20 + jsonLength + 8;
  const ARRAYS = {5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array};
  const SIZES = {SCALAR: 1, VEC3: 3};
  const accessor = index => {
    const a = json.accessors[index], v = json.bufferViews[a.bufferView], Type = ARRAYS[a.componentType];
    if (!Type || a.byteOffset || v.byteStride) throw new Error(`${url} holds an accessor this reader does not take`);
    return new Type(data, binStart + (v.byteOffset || 0), a.count * SIZES[a.type]);
  };
  const materials = (json.materials || []).map(m => {
    const pbr = m.pbrMetallicRoughness || {}, [r, g, b] = pbr.baseColorFactor || [1, 1, 1, 1];
    return new THREE.MeshStandardMaterial({name: m.name, color: new THREE.Color(r, g, b), metalness: pbr.metallicFactor ?? 1,
      roughness: pbr.roughnessFactor ?? 1, side: m.doubleSided ? THREE.DoubleSide : THREE.FrontSide});
  });
  const build = index => {
    const node = json.nodes[index], object = new THREE.Group();
    object.name = node.name || '';
    if (node.mesh !== undefined) for (const primitive of json.meshes[node.mesh].primitives) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(accessor(primitive.attributes.POSITION), 3));
      if (primitive.attributes.NORMAL !== undefined) geometry.setAttribute('normal', new THREE.BufferAttribute(accessor(primitive.attributes.NORMAL), 3));
      else geometry.computeVertexNormals();
      geometry.setIndex(new THREE.BufferAttribute(accessor(primitive.indices), 1));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, materials[primitive.material] || new THREE.MeshStandardMaterial());
      mesh.name = node.name || '';
      object.add(mesh);
    }
    if (node.translation) object.position.fromArray(node.translation);
    if (node.rotation) object.quaternion.fromArray(node.rotation);
    if (node.scale) object.scale.fromArray(node.scale);
    for (const child of node.children || []) object.add(build(child));
    return object;
  };
  const scene = json.scenes[json.scene || 0], group = new THREE.Group();
  group.name = scene.name || 'model';
  for (const index of scene.nodes) group.add(build(index));
  group.userData = {...(scene.extras || {})};
  return group;
}

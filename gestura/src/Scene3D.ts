import * as THREE from 'three';

export type ShapeName = 'Box' | 'Sphere' | 'Torus' | 'Octahedron' | 'Icosahedron' | 'Cone';

function createGeometry(shape: ShapeName): THREE.BufferGeometry {
  switch (shape) {
    case 'Box':         return new THREE.BoxGeometry(1.4, 1.4, 1.4);
    case 'Sphere':      return new THREE.SphereGeometry(0.9, 64, 64);
    case 'Torus':       return new THREE.TorusGeometry(0.8, 0.32, 32, 100);
    case 'Octahedron':  return new THREE.OctahedronGeometry(1.1);
    case 'Icosahedron': return new THREE.IcosahedronGeometry(1.0);
    case 'Cone':        return new THREE.ConeGeometry(0.9, 1.8, 64);
    default:            return new THREE.BoxGeometry(1.4, 1.4, 1.4);
  }
}

export class Scene3D {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private mesh: THREE.Mesh;
  private wireframe: THREE.Mesh;
  private currentColor: number = 0x00d4ff;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.camera.position.set(0, 0, 5);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x112244, 1.5);
    this.scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 3, 20);
    pointLight1.position.set(5, 5, 5);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x4488ff, 2, 20);
    pointLight2.position.set(-5, -3, 3);
    this.scene.add(pointLight2);

    const rimLight = new THREE.DirectionalLight(0x002255, 1);
    rimLight.position.set(0, -5, -5);
    this.scene.add(rimLight);

    // Initial shape
    const geo = createGeometry('Torus');
    const mat = new THREE.MeshPhongMaterial({
      color: this.currentColor,
      emissive: new THREE.Color(this.currentColor).multiplyScalar(0.15),
      shininess: 120,
      specular: 0xffffff,
    });
    this.mesh = new THREE.Mesh(geo, mat);

    const wireMat = new THREE.MeshBasicMaterial({
      color: this.currentColor,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    this.wireframe = new THREE.Mesh(geo.clone(), wireMat);

    this.scene.add(this.mesh);
    this.scene.add(this.wireframe);

    window.addEventListener('resize', () => this.onResize());
  }

  setShape(name: ShapeName): void {
    const geo = createGeometry(name);
    this.mesh.geometry.dispose();
    this.mesh.geometry = geo;
    this.wireframe.geometry.dispose();
    this.wireframe.geometry = geo.clone();
  }

  setColor(hex: string): void {
    this.currentColor = parseInt(hex.replace('#', ''), 16);
    (this.mesh.material as THREE.MeshPhongMaterial).color.setHex(this.currentColor);
    (this.mesh.material as THREE.MeshPhongMaterial).emissive
      .setHex(this.currentColor)
      .multiplyScalar(0.15);
    (this.wireframe.material as THREE.MeshBasicMaterial).color.setHex(this.currentColor);
  }

  setPosition(x: number, y: number): void {
    this.mesh.position.set(x, y, 0);
    this.wireframe.position.set(x, y, 0);
  }

  setRotation(x: number, y: number, z: number): void {
    this.mesh.rotation.set(x, y, z);
    this.wireframe.rotation.set(x, y, z);
  }

  setScale(s: number): void {
    this.mesh.scale.setScalar(s);
    this.wireframe.scale.setScalar(s);
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

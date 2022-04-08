import "./style.css";

import * as THREE from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Water } from "three/examples/jsm/objects/Water.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

let camera, scene, renderer;
let controls, water, sun, frustum, cameraViewProjectionMatrix;

let KeyActive = {
    up: false,
    down: false,
    left: false,
    right: false,
    leftClick: false,
    rightClick: false,
};

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
var baseTexture = textureLoader.load(
    "assets/boat-2/textures/boat_baseColor.png"
);
var normalTexture = textureLoader.load(
    "assets/boat-2/textures/boat_normal.png"
);
var metalnessTexture = textureLoader.load(
    "assets/boat-2/textures/boat_metallicRoughness.png"
);

function random(min, max) {
    return Math.random() * (max - min) + min;
}

class Boat {
    constructor() {
        loader.load("assets/boat-2/scene.gltf", (gltf) => {
            scene.add(gltf.scene);
            gltf.scene.scale.set(0.05, 0.05, 0.05);
            gltf.scene.position.set(5, -0.12, 50);
            gltf.scene.rotation.y = 0.5;
            gltf.scene.normal;
            gltf.scene.traverse((o) => {
                if (o.isMesh) {
                    o.material.normalMap = normalTexture;
                    o.material.map = baseTexture;
                    o.material.metalnessMap = metalnessTexture;
                }
            });

            this.boat = gltf.scene;
            this.speed = {
                vel: 0,
                rot: 0,
            };
        });
    }

    stop() {
        this.speed.vel = 0;
        this.speed.rot = 0;
    }

    update() {
        if (this.boat) {
            this.boat.rotation.y += this.speed.rot;
            this.boat.translateZ(-this.speed.vel);
        }
    }
}

const boat = new Boat();

class Trash {
    constructor(_scene) {
        scene.add(_scene);
        _scene.scale.set(1.5, 1.5, 1.5);
        if (Math.random() > 0.6) {
            _scene.position.set(random(-100, 100), -0.5, random(-100, 100));
        } else {
            _scene.position.set(random(-500, 500), -0.5, random(-1000, 1000));
        }

        this.trash = _scene;
    }

    update() {
        this.trash.translateZ(-0.2);
    }
}

async function loadModel(url) {
    return new Promise((resolve, reject) => {
        loader.load(url, (gltf) => {
            resolve(gltf.scene);
        });
    });
}

let boatModel = null;
async function createTrash() {
  if (!boatModel) {
    boatModel = await loadModel("assets/barrels/scene.gltf")
  }
  return new Trash(boatModel.clone())
}

let trashes = []
const TRASH_COUNT = 200

init();
animate();

async function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    document.body.appendChild(renderer.domElement);

    frustum = new THREE.Frustum();
    cameraViewProjectionMatrix = new THREE.Matrix4();

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(
        55,
        window.innerWidth / window.innerHeight,
        1,
        20000
    );
    camera.position.set(5, 100, 50);
    const ambientLight = new THREE.AmbientLight(0x404040, 1); // soft white light
    scene.add(ambientLight);

    sun = new THREE.Vector3();

    // Water

    const waterGeometry = new THREE.PlaneGeometry(10000, 10000);

    water = new Water(waterGeometry, {
        textureWidth: 512,
        textureHeight: 512,
        waterNormals: new THREE.TextureLoader().load(
            "assets/waternormals.jpg",
            function (texture) {
                texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            }
        ),
        sunDirection: new THREE.Vector3(),
        sunColor: 0xffffff,
        waterColor: 0x001e0f,
        distortionScale: 3.7,
        fog: scene.fog !== undefined,
    });

    water.rotation.x = -Math.PI / 2;

    scene.add(water);

    // Skybox

    const sky = new Sky();
    sky.scale.setScalar(10000);
    scene.add(sky);

    const skyUniforms = sky.material.uniforms;

    skyUniforms["turbidity"].value = 10;
    skyUniforms["rayleigh"].value = 2;
    skyUniforms["mieCoefficient"].value = 0.005;
    skyUniforms["mieDirectionalG"].value = 0.8;

    const parameters = {
        elevation: 2,
        azimuth: 170,
    };

    const pmremGenerator = new THREE.PMREMGenerator(renderer);

    function updateSun() {
        const phi = THREE.MathUtils.degToRad(80 - parameters.elevation);
        const theta = THREE.MathUtils.degToRad(parameters.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        sky.material.uniforms["sunPosition"].value.copy(sun);
        water.material.uniforms["sunDirection"].value.copy(sun).normalize();

        scene.environment = pmremGenerator.fromScene(sky).texture;
    }

    updateSun();

  for (let i = 0; i < TRASH_COUNT; i++) {
    
    const trash = await createTrash()
    trashes.push(trash)
  }
    controls = new OrbitControls(camera, renderer.domElement);
    controls.maxPolarAngle = Math.PI * 0.495;
    controls.target.set(5, -0.12, 50);
    controls.minDistance = 40.0;
    controls.maxDistance = 200.0;
    // controls.enabled = false;
    controls.update();

    const waterUniforms = water.material.uniforms;

    for (let i = 0; i < TRASH_COUNT; i++) {
        const trash = await createTrash();
        trashes.push(trash);
    }

    window.addEventListener("resize", onWindowResize);

    window.addEventListener("keydown", function (ev) {});
    window.addEventListener("keyup", function (ev) {});
    window.addEventListener("mousedown", (ev) => {
        if (ev.button == 1) {
            // left Mouse Button
            KeyActive.leftClick = true;
        } else if (ev.button == 1) {
            // Right Mouse Button
            KeyActive.leftClick = true;
        }
    });
    window.addEventListener("mouseup", (ev) => {
        if (ev.button == 1) {
            // left Mouse Button
            KeyActive.leftClick = false;
        } else if (ev.button == 1) {
            // Right Mouse Button
            KeyActive.leftClick = false;
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);
}

function debounce(func, timeout = 1000 / 60) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            func.apply(this, args);
        }, timeout);
    };
}

function CheckWithinViewbox() {
    camera.updateMatrixWorld();
    camera.matrixWorldInverse.invert(camera.matrixWorld);
    // cameraViewProjectionMatrix.multiplyMatrices(
    //     camera.projectionMatix,
    //     camera.matrixWorldInverse
    // );

    frustum.setFromProjectionMatrix(cameraViewProjectionMatrix);
}

function animate() {
    requestAnimationFrame(debounce(animate));
    render();
    boat.update();
    CheckWithinViewbox();

    for (let i = 0; i < trashes.length; i++) {
        trashes[i].update();
    }
}

function render() {
    water.material.uniforms["time"].value += 1.0 / 60.0;

    renderer.render(scene, camera);
}

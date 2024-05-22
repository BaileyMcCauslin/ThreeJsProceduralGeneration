import * as THREE from 'three';

// import the noise functions you need
import { createNoise2D } from 'simplex-noise';

const wKey = 87;
const sKey = 83;
const aKey = 65;
const dKey = 68;
const spaceKey = 32;
const backKey = 8;
const xSpeed = 3.0;
const ySpeed = 1.0;
const zSpeed = 3.0;



class Player {
    constructor(scene) {
        // Initialize the player's position
        this.position = new THREE.Vector3(0, 1, 5);

        // Initialize the player camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.copy(this.position);
        this.camera.rotation.order = "YXZ";

        // Store a reference to the player object
        const self = this;
        
        // Key state tracking
        this.keys = {};

        // Listen for keyboard presses and releases
        document.addEventListener("keydown", function(event) {
            self.keys[event.code] = true;
        }, false);
        document.addEventListener("keyup", function(event) {
            self.keys[event.code] = false;
        }, false);
        
        // Listen for mouse movement
        document.addEventListener('mousemove', function(event) {
            self.onMouseMove(event);
        }, false);

        // Set the player's health
        this.health = 150;

        // Initialize if the player is on the ground or not
        this.isGrounded = true;

        // Initialize the user's alive status
        this.isAlive = true;

        // Initialize a jump velocity for the player 
        this.jumpVelocity = 6;

        // Initialize gravity for the player 
        this.gravity = 6;

        // Set the velocity of the player
        this.velocity = new THREE.Vector3();
        this.horizontalVelocity = new THREE.Vector3();

        // Initialize the jumping movement
        this.jumping = false;

        // Create a raycaster for ground detection
        this.raycaster = new THREE.Raycaster();
        this.scene = scene; // Reference to the scene to check for intersections
    }

    // Detect mouse movements to rotate the camera 
    onMouseMove(event) {
        const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

        const sensitivity = 0.05;

        this.camera.rotation.y -= movementX * sensitivity;
        this.camera.rotation.x -= movementY * sensitivity;

        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.camera.rotation.x));
    }

    // Set alive state
    setAliveState(state) {
        this.isAlive = state;
    }

    // Set health 
    setHealth(health) {
        this.health = health;
    }

    // Make player take damage
    takeDamage(damage) {
        this.health -= damage;
        if (this.health <= 0) {
            this.setAliveState(false);
        }
    }

    getGrounded() {
        return this.isGrounded;
    }

    setGrounded(state) {
        this.isGrounded = state;
    }

    // Move the player according to keyboard input
    processInput(delta) {
        this.horizontalVelocity.set(0, 0, 0); // Reset horizontal velocity

        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();

        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        right.crossVectors(forward, this.camera.up).normalize();

        if (this.keys['KeyW']) {
            this.horizontalVelocity.add(forward);
        }
        if (this.keys['KeyS']) {
            this.horizontalVelocity.sub(forward);
        }
        if (this.keys['KeyA']) {
            this.horizontalVelocity.sub(right);
        }
        if (this.keys['KeyD']) {
            this.horizontalVelocity.add(right);
        }

        // Normalize the horizontal velocity vector to maintain consistent speed
        if (this.horizontalVelocity.length() > 0) {
            this.horizontalVelocity.normalize().multiplyScalar(zSpeed);
        }

        if (this.keys['Space']) {
            this.jump();
        }
    }

    // Initialize the jump mechanic
    jump() {
        if (this.getGrounded() && !this.jumping) {
            this.jumping = true;
            this.velocity.y = this.jumpVelocity;
        }
    }

    // Update the player every frame
    update(delta,scene) {
        this.processInput(delta);

        // Check for ground using raycasting.
        this.raycaster.set(this.position, new THREE.Vector3(0, -1, 0));

        // Check for ray hits
        const intersects = this.raycaster.intersectObjects(scene.children, true);

        if (intersects.length > 0 && intersects[0].distance <= 1.1) {
            this.setGrounded(true);
            this.jumping = false;
            this.position.y = intersects[0].point.y + 1; // Adjust the player's height if needed
        } else {
            this.setGrounded(false);
            this.velocity.y -= this.gravity * delta;
        }

        // Apply horizontal movement
        this.position.addScaledVector(this.horizontalVelocity, delta);

        // Apply vertical movement
        this.position.y += this.velocity.y * delta;

        // Update the camera position
        this.updateCameraPosition(this.position);
    }

    // Update camera position
    updateCameraPosition(newPosition) {
        this.camera.position.copy(newPosition);
        this.camera.position.y += 2; // Adjust the camera height as needed
    }

    // Set player position
    setPosition(newPosition) {
        this.position.copy(newPosition);
    }
}

const scene = new THREE.Scene();
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
renderer.setClearColor(0xffffff, 0);

const player = new Player();

// Define the size of the box
const boxWidth = 2;
const boxHeight = 2;
const boxDepth = 2;

const geometry = new THREE.BoxGeometry(20, 0.5, 20);
const material = new THREE.MeshBasicMaterial( { color: 0x000000 } ); 
const cube = new THREE.Mesh( geometry, material ); 
scene.add( cube ); 

const newgeometry = new THREE.BoxGeometry(5, 6, 5);
const newmaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00 } ); 
const newcube = new THREE.Mesh( newgeometry, newmaterial ); 
scene.add( newcube ); 

let clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    let delta = clock.getDelta(); // Get the time elapsed since the last frame
    player.update(delta,scene); // Pass delta to the update method
    renderer.render(scene, player.camera);
}

animate();

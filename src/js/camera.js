import * as THREE from 'three';

const zSpeed = 10.0;
const FOV = 75;
const NEAR = 0.1;
const FAR = 1000;

export class Camera {
    constructor(scene) {
        // Initialize the player's position
        this.position = new THREE.Vector3(0, 25, 5);
        this.scene = scene;

        // Initialize the player camera
        this.camera = new THREE.PerspectiveCamera(FOV, 
                             window.innerWidth / window.innerHeight, NEAR, FAR);
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

        // Initialize a jump velocity for the player 
        this.jumpVelocity = 6;

        // Set the velocity of the player
        this.velocity = new THREE.Vector3();
        this.horizontalVelocity = new THREE.Vector3();

        // Create a raycaster for ground detection
        this.raycaster = new THREE.Raycaster();

        // Mouse sensitivity
        this.sensitivity = 0.005;
    }

    // Detect mouse movements to rotate the camera 
    onMouseMove(event) {
        // Get the mouse movement
        const movementX = event.movementX || event.mozMovementX || 
                                                     event.webkitMovementX || 0;
        const movementY = event.movementY || event.mozMovementY || 
                                                     event.webkitMovementY || 0;

        // Calculate the rotation of the camera based on mouse movement
        this.camera.rotation.y -= movementX * this.sensitivity;
        this.camera.rotation.x -= movementY * this.sensitivity;
        
        // Clamp the x rotation to prevent flipping
        this.camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, 
                                                       this.camera.rotation.x));
    }

    // Move the player according to keyboard input
    processInput() {

        // Set the horizontal to zero
        this.horizontalVelocity.set(0, 0, 0);
    
        // Declare movement vectors
        const forward = new THREE.Vector3();
        const right = new THREE.Vector3();
    
        // Get the direction the camera is pointing
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();
        right.crossVectors(forward, this.camera.up).normalize();

        // Detect key movements
        if(this.keys['KeyW']) {
            this.horizontalVelocity.add(forward);
        }
        if(this.keys['KeyS']) {
            this.horizontalVelocity.sub(forward);
        }
        if(this.keys['KeyA']) {
            this.horizontalVelocity.sub(right);
        }
        if(this.keys['KeyD']) {
            this.horizontalVelocity.add(right);
        }
        if(this.keys['Space']) {
            this.position.y += 1;
        }
        if(this.keys['ShiftLeft'] || this.keys['ShiftRight']) {
            this.position.y -= 1;
        }

        // Normalize the horizontal velocity vector to maintain consistent speed
        if(this.horizontalVelocity.length() > 0) {
            this.horizontalVelocity.normalize().multiplyScalar(zSpeed);
        }
    }

    // Update the player every frame
    update(delta) {
        // Check for player input
        this.processInput();

        // Apply horizontal movement
        this.position.addScaledVector(this.horizontalVelocity, delta);

        // Update the camera position
        this.updateCameraPosition(this.position);
    }

    // Update camera position
    updateCameraPosition(newPosition) {
        this.camera.position.copy(newPosition);
        this.camera.position.y += 2;
    }

    // Set player position
    setPosition(newPosition) {
        this.position.copy(newPosition);
    }
}
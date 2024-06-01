import * as THREE from 'three';
import {PointerLockControls} from
                           'three/examples/jsm/controls/PointerLockControls.js';
import {Camera} from './camera.js';
import {TerrainGenerator} from './terrain.js';

// Initialize the Three.js scene and renderer
const initializeThreeJsScene = () => {
    // Create the scene and renderer
    const scene = new THREE.Scene();
    const renderer = new THREE.WebGLRenderer();

    // Set the size of the render. In our case, the whole window.
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Append the renders element to the document
    document.body.appendChild(renderer.domElement);

    // Set the renders background to black
    renderer.setClearColor(0x000000, 1);

    return [scene, renderer];
}

// Initialize camera and terrain generator
const initializeCameraAndTerrain = (scene) => {
    // Initalize the camera that chunk based rendering relies on
    const camera = new Camera(scene);
    
    // Initalize the terrain generator that populates our scene
    const terrainGen = new TerrainGenerator(scene, camera);
    
    // Generate starting chunks so the chunk loader has a starting point
    terrainGen.generateStartingChunks();

    return [camera, terrainGen];
}

// Initialize pointer lock controls. Locks cursor in scene upon click
// NOTE: Hit esc to unlock cursor
const initializePointerLockControls = (camera, renderer) => {
    // Initalize the controls
    const controls = new PointerLockControls(camera.camera,renderer.domElement);
    
    // Add the controls object to the screen
    camera.scene.add(controls.getObject());

    // Check if the pointer object is present in the document.
    // Reverse whatever the current value is
    const onPointerlockChange = () => {
        document.pointerLockElement === renderer.domElement ?
            controls.enabled = true : controls.enabled = false;
    };

    // Detect change in pointer lock 
    document.addEventListener('pointerlockchange', onPointerlockChange, false);

    // Lock controls upon click
    renderer.domElement.addEventListener('click', () => {
        renderer.domElement.requestPointerLock();
    });
}

// Initialize window resize handler
const initializeWindowResizeHandler = (camera, renderer) => {
    window.addEventListener('resize', () => {
        // Change the camera aspect ratio based on if the window resized
        camera.camera.aspect = window.innerWidth / window.innerHeight;

        // Update it's projection based on the new aspect ratio
        camera.camera.updateProjectionMatrix();

        // Set the size of the renderer to render at the new height and width
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, false);
}

// Calculate frames per second
const calculateFPS = (time, frames, prevTime) => {
    // Calculate the current frames per second (FPS) by dividing the number of
    // frames by the time elapsed since the previous measurement, then 
    // multiplying by 1000 to convert milliseconds to seconds.
    return Math.round((frames * 1000) / (time - prevTime));
}

// FPS counter function
const createFPSCounter = (fpsElement) => {
    // Initalize the starting number of frames
    let frames = 0;

    // Get the previous time in the loop
    let prevTime = performance.now();

    return () => {
        // Add 1 to the frames
        frames++;

        // Get the current time
        const time = performance.now();

        // Check if the new time has passed one second
        if(time >= prevTime + 1000) {
            // Display the fps calculation
            fpsElement.textContent = `FPS: ${calculateFPS(time, 
                                                            frames, prevTime)}`;
            // Reset the frames
            frames = 0;

            // Set the previous time to current for next iteration
            prevTime = time;
        }
    };
}

// Main animation loop
const animate = (scene, camera, terrainGen, renderer, fpsElement, fpsCounter,
                                                                     clock) => {
    // Recurse for animation frame
    requestAnimationFrame(() => animate(scene, camera, terrainGen, renderer, 
                                                fpsElement, fpsCounter, clock));

    // Display FPS
    fpsCounter();

    // Get the delta time
    let delta = clock.getDelta();
    
    // Update the camera(This is for movement)
    camera.update(delta);

    // Generate new terrain chunks if needed
    terrainGen.generateChunks();

    // Render the scene
    renderer.render(scene, camera.camera);
}

// Main function to initialize everything and start animation loop
const main = () => {
    // Get the scene and renderer
    const [scene, renderer] = initializeThreeJsScene();
    
    // Get camera and terrain generator
    const [camera, terrainGen] = initializeCameraAndTerrain(scene);

    // Create a pointer lock controls that locks cursor on click
    initializePointerLockControls(camera, renderer);

    // Initalize an event to resize renderer and adjust camera based on
    //                                                               window size
    initializeWindowResizeHandler(camera, renderer);

    // Get the html element corresponding to the fps display
    const fpsElement = document.getElementById("fps-counter");

    // Start the fps counter
    const fpsCounter = createFPSCounter(fpsElement);
    
    // Create a clock for movement smoothing
    const clock = new THREE.Clock();

    // Start the main animation loop
    animate(scene, camera, terrainGen, renderer, fpsElement, fpsCounter, clock);
}

main();


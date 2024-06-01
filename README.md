# Procedural Generation in Three.js

* Three.js is a powerful JavaScript API for rendering 3D graphics in web browsers. You can learn more about it on the [Three.js website](https://threejs.org/) or its [Wikipedia page](https://en.wikipedia.org/wiki/Three.js).

* The primary objective of this project was not only to become proficient with the Three.js library but also to explore procedural terrain generation using a chunk-based system.

* Procedural terrain generation is a technique for generating terrain data algorithmically, rather than manually creating it. By utilizing noise functions (such as Simplex noise), we can achieve variations in our terrain landscapes and assign colors to each height value.

* To create seemingly endless terrain, we employ a chunk-based approach. This involves breaking the terrain generation into smaller chunks that can be loaded and unloaded based on the camera's position, thus conserving memory resources.

# Video
Check out the video of the project [Here](https://youtu.be/pgF-DRnrvd8)! I aplogize that OBS cut off a quarter of the screen but you get the idea. Also at 0:58 you can see me zoom in on a chunk boundry and the stitching is a bit off. It's a goal of mine to fix this at somepoint by computing the chunk ratio instead of a hard-coded value.

# Run it yourself
I used vite but im sure you can run it how you prefer. Assuming you use node js. 

# TODO'S

### Improve Chunk Mesh Stitching
Currently, we use a hardcoded ratio to stitch different terrain chunks together. However, this approach may result in tiny gaps or overlaps, affecting the colors of neighboring vertices. We need to find a way to compute this ratio dynamically to achieve perfect or near-perfect stitching.

### Refactor and Optimize Performance
While the code runs at nearly maximum frames per second (60FPS), there are opportunities to optimize storage and runtime complexity, especially for performance enhancements. Techniques such as Level of Detail (LOD) using quadtrees could be explored for this purpose.

### Implement Runtime Editing Menu
An interactive menu allowing users to adjust terrain generation parameters during runtime would greatly enhance the project's usability. Features like modifying amplitude and divisor values for simplex noise generation would be particularly beneficial.

### Future Enhancements
Stay tuned for further updates and improvements! There are always more features and optimizations to explore and implement.

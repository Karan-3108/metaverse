// use it to import everything you might ever need, from CDN

// Metaverse classes
export { METAVERSE, Metaverse, SceneEvent, VREvent, EventRecorder, Client, SceneProperties, VRObject, Point, Rotation, ID } from "./metaverse.js";
export { MetaverseUI, METAVERSEUI, LogoRoom, Portal, ServerFolder, LoadProgressIndicator, RecorderUI, FloorRibbon, Buttons, VRHelper, World, WorldManager, MediaStreams, VideoAvatar } from "./metaverse-ui.js";
export { Avatar } from "./avatar.js";

// required babylonjs libraries, CDN
import * as BABYLON from "https://cdn.babylonjs.com/babylon.js";
import 'https://cdn.babylonjs.com/loaders/babylonjs.loaders.min.js';
import 'https://cdn.babylonjs.com/proceduralTexturesLibrary/babylonjs.proceduralTextures.min.js';
import 'https://cdn.babylonjs.com/postProcessesLibrary/babylonjs.postProcess.min.js';
import 'https://cdn.babylonjs.com/materialsLibrary/babylonjs.materials.min.js';
export { BABYLON };
import * as GUI from 'https://cdn.babylonjs.com/gui/babylon.gui.min.js';
export {GUI};
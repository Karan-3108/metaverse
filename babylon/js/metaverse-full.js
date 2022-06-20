// used to bundle it all together

// Metaverse classes
export { METAVERSE, Metaverse, SceneEvent, VREvent, EventRecorder, Client, SceneProperties, VRObject, Point, Rotation, ID } from "./metaverse.js";
export { MetaverseUI, METAVERSEUI, LogoRoom, Portal, ServerFolder, LoadProgressIndicator, RecorderUI, FloorRibbon, Buttons, VRHelper, World, WorldManager, MediaStreams, VideoAvatar } from "./metaverse-ui.js";
export { Avatar } from "./avatar.js";

// required babylonjs libraries
import * as BABYLON from "babylonjs";
import 'babylonjs-loaders';
import 'babylonjs-procedural-textures';
import 'babylonjs-post-process';
import 'babylonjs-materials';
export { BABYLON };
import * as GUI from 'babylonjs-gui';
export {GUI};

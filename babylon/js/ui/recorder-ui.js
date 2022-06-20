import {METAVERSE} from '../client/metaverse.js';
import {METAVERSEUI} from './metaverse-ui.js';

/**
Event Recorder is server-side component.
This UI sends commands to the server that control recording and playback.
UI buttons (record, stop, play) are bound to current camera.
*/
export class RecorderUI {
  /** @param scene babylonjs scene */
  constructor( scene ) {
    // parameters
    this.scene = scene;
    this.recorder = null;
  }
  /** Shows the UI */
  showUI() {


    this.recordButton = METAVERSEUI.hud.addButton("REC", "https://www.babylonjs-playground.com/textures/icons/Dot.png"); // FIXME: cdn
    this.recordButton.onPointerDownObservable.add( () => this.record());
    
    this.stopButton = METAVERSEUI.hud.addButton("Stop","https://www.babylonjs-playground.com/textures/icons/Pause.png"); // FIXME: cdn
    this.stopButton.onPointerDownObservable.add( () => this.stop());
    this.stopButton.isVisible = false;

    this.playButton = METAVERSEUI.hud.addButton( "Play", "https://www.babylonjs-playground.com/textures/icons/Play.png"); // FIXME: cdn
    this.playButton.onPointerDownObservable.add( () => this.play());
    this.playButton.isVisible = false;
  }
  
  /** Start recording */
  record() {
    console.log("Recording...");
    if ( ! this.recorder ) {
      // create recorder on the server
      METAVERSE.send('{"command":{"Recording":{"action":"record"}}}');
    }
    this.stopButton.isVisible = true;
    this.playButton.isVisible = false;
  }
  /** Stop recording */
  stop() {
    console.log('Stopped');
    METAVERSE.send('{"command":{"Recording":{"action":"stop"}}}');
    this.recordButton.isVisible = true;
    this.playButton.isVisible = true;
    this.stopButton.isVisible = false;
  }
  /** Start playing */
  play() {
    console.log('Playing...');
    METAVERSE.send('{"command":{"Recording":{"action":"play"}}}');
    this.recordButton.isVisible = false;
    this.stopButton.isVisible = true;
  }
  
}
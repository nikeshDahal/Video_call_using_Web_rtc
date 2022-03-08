import * as store from "./store.js";
import * as wss from "./wss.js";
import * as webRTCHandler from "./webRTCHandler.js";
import * as constants from "./constants.js";
import * as ui from "./ui.js";
//import { decryptedData, encryptedData } from "./wss.js";

//initialization of socketIO connection
const socket = io("/"); //connection from the client side with our socket
console.log("printing socket");
console.log(socket);

//connection code
wss.registerSocketEvents(socket);

webRTCHandler.getLocalPreview();

//register event listner for personal code copy button
const personalCodeCopyButton = document.getElementById(
  "personal_code_copy_button"
);

personalCodeCopyButton.addEventListener("click", () => {
  //The Clipboard interface's writeText() property writes the specified text string to the system clipboard.
  //copy the personal code
  const personalCode1 = store.getState().socketId;
  /////////////////////////
  wss.encryptPersonalCode(personalCode1);
  /////////////////////////
  //console.log("encryptedData: " + encryptedData);

  navigator.clipboard;
  navigator.clipboard.writeText(encryptedData);
});

/////register event listner for connection buttons

const personalCodeVideoButton = document.getElementById(
  "personal_code_video_button"
);
//----------------------sending offer to server... berfore that checking if caller wants to reject the call---------------
personalCodeVideoButton.addEventListener("click", () => {
  console.log("video button clicked");

  const calleePersonalCode = document.getElementById(
    "personal_code_input"
  ).value;
  const callType = constants.callType.VIDEO_PERSONAL_CODE;
  //calleePersonalCode is code of the person to whom we want to call
  /////////////////////////
  wss.decryptPersonalCode(calleePersonalCode);
  /////////////////////////
  //console.log("decryptedData: " + decryptedData);
  //webRTCHandler.sendPreOffer(callType, decryptedData);
});

//event listeners for video call buttons

const micButton = document.getElementById("mic_button");
micButton.addEventListener("click", () => {
  const localStream = store.getState().localStream;
  const micEnabled = localStream.getAudioTracks()[0].enabled;
  //returns either true or false
  localStream.getAudioTracks()[0].enabled = !micEnabled;
  ui.updateMicButton(micEnabled);
});

const cameraButton = document.getElementById("camera_button");
cameraButton.addEventListener("click", () => {
  const localStream = store.getState().localStream;
  const cameraEnabled = localStream.getVideoTracks()[0].enabled;
  localStream.getVideoTracks()[0].enabled = !cameraEnabled;
  ui.updateCameraButton(cameraEnabled);
});

const switchForScreenSharingButton = document.getElementById(
  "screen_sharing_button"
);
switchForScreenSharingButton.addEventListener("click", () => {
  const screenSharingActive = store.getState().screenSharingActive;
  webRTCHandler.switchBetweenCameraAndScreenSharing(screenSharingActive);
});

//messenger

const newMessageInput = document.getElementById("new_message_input");
newMessageInput.addEventListener("keydown", (event) => {
  console.log("change occured");
  const key = event.key;

  if (key === "Enter") {
    webRTCHandler.sendMessageUsingDataChannel(event.target.value);
    ui.appendMessage(event.target.value, true);
    newMessageInput.value = "";
  }
});

// const sendMessageButton = document.getElementById('send_meesage_button');
// sendMessageButton.addEventListener('click', () => {
//     const message = newMessageInput.value;
//     webRTCHandler.sendMessageUsingDataChannel(message);
//     ui.appendMessage(message, true);
//     newMessageInput.value = "";
// })
// elements.getIncomingCallDialog(
//     "VIDEO",
//     () => {},
//     () => {}
//

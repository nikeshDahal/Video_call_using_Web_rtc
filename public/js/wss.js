//web socket server
import * as store from "./store.js";
import * as ui from "./ui.js";
import * as webRTCHandler from "./webRTCHandler.js";
import * as constants from "./constants.js";

var encryptedData;
var decryptedData;

let socketIO = null;

export const registerSocketEvents = (socket) => {
  socketIO = socket;

  // is called directly before the connection has been opened   (callbacks)
  socket.on("connect", () => {
    console.log("client sucessfully connected to socket.io server");
    console.log(socket.id);
    store.setSocketId(socket.id); //store the values in the store
    ui.updatePersonalCode(socket.id); //updating the frontend html
  });

  //-----------------receiver/callee connection code-----------------
  socket.on("pre-offer", (data) => {
    console.log("receiver client sucessfully connected to socket.io ");
    //caller id
    console.log(data);
    webRTCHandler.handlePreOffer(data);
  });

  socket.on("pre-offer-answer", (data) => {
    webRTCHandler.handlePreOfferAnswer(data);
  });
  //-------------3. sending webrrct offer------------------listener
  socket.on("webRTC-signalling", (data) => {
    switch (data.type) {
      case constants.webRTCSignalling.OFFER:
        webRTCHandler.handleWebRTCOffer(data);
        break;
      case constants.webRTCSignalling.ANSWER:
        webRTCHandler.handleWebRTCAnswer(data);
        break;
      case constants.webRTCSignalling.ICE_CANDIDATE:
        webRTCHandler.handleWebRTCCandidate(data);
        break;

      default:
        return;
    }
  });

  //////////////////////
  socket.on("encrypt_personal_code", (data) => {
    encryptedData = data;

    console.log("encryptedDataBefore: " + encryptedData);
  });

  socket.on("decrypt_personal_code", (data) => {
    decryptedData = data;
    console.log("decryptedData: line 33 " + decryptedData);

    webRTCHandler.sendPreOffer("VIDEO_PERSONAL_CODE", decryptedData);
  });
};

/////////////////////////
export const encryptPersonalCode = (data) => {
  socketIO.emit("encrypt_personal_code", data);
};

export const decryptPersonalCode = (data, id) => {
  const data1 = { data, id };
  socketIO.emit("decrypt_personal_code", data1);
};
///////////////////////
//-------------------sending offer to to server-------------------------
export const sendPreOffer = (data) => {
  console.log("offer sent to server from caller");
  socketIO.emit("pre-offer", data);
};

export const sendPreOfferAnswer = (data) => {
  socketIO.emit("pre-offer-answer", data);
};

//-------------3. sending webrrct offer------------------emitting event to server
export const sendDataUsingWebRTCSignallling = (data) => {
  socketIO.emit("webRTC-signalling", data);
};

//main.js

//initialization of socketIO connection
const socket = io("/"); //connection from the client side with our socket
console.log("printing socket");
console.log(socket);

//connection code
registerSocketEvents(socket);

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
  encryptPersonalCode(personalCode1);

  setTimeout(() => {
    console.log("encryptedDataLatter: " + encryptedData);
    navigator.clipboard;
    navigator.clipboard.writeText(encryptedData);
  }, 1000);

  /////////////////////////
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
  const id = store.getState().socketId;
  decryptPersonalCode(calleePersonalCode, id);
  /////////////////////////
});

// function getUser1(){
//     setTimeout(()=>{

//     },2000);
// }

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

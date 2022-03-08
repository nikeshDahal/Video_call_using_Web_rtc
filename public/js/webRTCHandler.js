import * as wss from "./wss.js";
import * as store from "./store.js";
import * as constants from "./constants.js";
import * as ui from "./ui.js";

let connectedUserDetails;

let peerConnection;
let dataChannel;

const defaultConstraints = {
  audio: true,
  video: {optional:[ {height:160}, {width:120} ]}
};

const configuration = {
  //address of stun server: get information about internet and how other user can communicate with us
  iceServers: [
    { urls: "stun:stun.l.google.com:13902" },
    { urls: "stun:stun.services.mozilla.com" }
  ]
};

//------------- 1.getting access to camera and microphone and showing that in local preview ---------
export const getLocalPreview = () => {
  navigator.mediaDevices
    .getUserMedia(defaultConstraints)
    .then((stream) => {
      ui.updateLocalVideo(stream);
      store.setLocalStream(stream);
    })
    .catch((err) => {
      console.log("error occured when trying to access camera");
      console.log(err);
    });
};

//-------------- 2. Creating Peer Connection -------------
const createPeerConnection = () => {
  peerConnection = new RTCPeerConnection(configuration);
  console.log("peerConnection:");
  console.log(peerConnection);

  // dataChannel = peerConnection.createDataChannel('chat');

  // peerConnection.ondatachannel = (event) => {
  //     const dataChannel = event.channel;

  //     dataChannel.onopen = () => {
  //         console.log('peer connection is ready to receive data channel message');

  //     };

  //     dataChannel.onmessage = (event) => {
  //         console.log("message came from data channel");
  //         const message = JSON.parse(event.data);
  //         ui.appendMessage(message);
  //     };
  // };

  peerConnection.onicecandidate = (event) => {
    console.log("getting ice candidate from stun server");
    console.log("event.candidate");
    console.log(event.candidate);
    //candidate:2087201215 1 udp 2122260223 192.168.1.14 61878 typ host generation 0 ufrag 0/qe network-id 1 network-cost 10"
    if (event.candidate) {
      // send our ice candidates to other peer
      console.log("1");
      console.log("connectedUserDetails: " + connectedUserDetails.socketId);
      wss.sendDataUsingWebRTCSignallling({
        ////////
        connectedUserSocketId: connectedUserDetails.socketId,
        type: constants.webRTCSignalling.ICE_CANDIDATE,
        candidate: event.candidate
      });
    }
  };

  peerConnection.onconnectionstatechange = (event) => {
    if (peerConnection.connectionState === "connected") {
      console.log("successfully connected with other peer");
    }
  };

  //receivinng tracks--initially empty w/o tracks
  const remoteStream = new MediaStream();
  store.setRemoteStream(remoteStream);
  ui.updateRemoteVideo(remoteStream);

  //now adding tracks
  peerConnection.ontrack = (event) => {
    remoteStream.addTrack(event.track);
  };

  //add our stream to peer connection

  if (
    connectedUserDetails.callType === constants.callType.VIDEO_PERSONAL_CODE
  ) {
    const localStream = store.getState().localStream;

    for (const track of localStream.getTracks()) {
      peerConnection.addTrack(track, localStream);
    }
  }
};

export const sendMessageUsingDataChannel = (message) => {
  const stringfiedMessage = JSON.stringify(message);
  dataChannel.send(stringfiedMessage);
};

//ask if the person wants to talk or not
//calleePersonalCode is person to be called
export const sendPreOffer = (callType, calleePersonalCode) => {
  // console.log('pre offer function executed')
  // console.log();
  // console.log(callType + ': ' + calleePersonalCode);
  connectedUserDetails = {
    callType,
    socketId: calleePersonalCode
  };

  if (callType === constants.callType.VIDEO_PERSONAL_CODE) {
    const data = {
      callType,
      calleePersonalCode
    };
    ui.showCallingDialog(callingDialogRejectCallHandler);
    wss.sendPreOffer(data);
  }
};

export const handlePreOffer = (data) => {
  console.log("pre offer came in another client");
  console.log(data);

  const { callType, callerSocketId } = data;
  //hjfkhfhakf heuifeu fhe fhe  fhh
  connectedUserDetails = {
    socketId: callerSocketId,
    callType
  };

  if (callType === constants.callType.VIDEO_PERSONAL_CODE) {
    ui.showIncomingCallDialog(callType, acceptCallHandler, rejectCallHandler);
  }
};

const acceptCallHandler = () => {
  console.log("call accepted");
  //-------------3. sending webrrc offer------------------
  //creating peer connection after accepting call
  console.log("1");
  createPeerConnection();

  sendPreOfferAnswer(constants.preOfferAnswer.CALL_ACCEPTED);
  ui.showCallElements(connectedUserDetails.callType);
};

const rejectCallHandler = () => {
  console.log("call rejected");
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED);
};

const callingDialogRejectCallHandler = () => {
  console.log("rejecting the call");
  ///////////////////////
  sendPreOfferAnswer(constants.preOfferAnswer.CALL_REJECTED);
};

const sendPreOfferAnswer = (preOfferAnswer) => {
  const data = {
    callerSocketId: connectedUserDetails.socketId,
    preOfferAnswer: preOfferAnswer
  };
  ui.removeAllDialogs();
  wss.sendPreOfferAnswer(data);
};

export const handlePreOfferAnswer = (data) => {
  const { preOfferAnswer } = data;
  ui.removeAllDialogs();

  // console.log('pre offer answer came');
  // console.log(data);

  if (preOfferAnswer === constants.preOfferAnswer.CALLEE_NOT_FOUND) {
    //show dailog that calle has not been found
    ui.showInfoDialog(preOfferAnswer);
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_UNAVAILABLE) {
    //show dailog that calle his not able to connect
    ui.showInfoDialog(preOfferAnswer);
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_REJECTED) {
    //show dailog that calle rejected the call
    ui.showInfoDialog(preOfferAnswer);
  }

  if (preOfferAnswer === constants.preOfferAnswer.CALL_ACCEPTED) {
    //show dailog that calle accepted
    ui.showCallElements(connectedUserDetails.callType);
    //3. creating peer connection after call has been accepted(sing the function created earlier)
    createPeerConnection();
    //3.caller
    sendWebRTCOffer();
  }
};

//-------------3. sending webrrct offer------------------
const sendWebRTCOffer = async () => {
  //creating offer
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  wss.sendDataUsingWebRTCSignallling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignalling.OFFER,
    offer: offer
  });
};

//----------------- 5. handling webrtc offer preparing webrtc answer and handling it at callecalleer side-----
export const handleWebRTCOffer = async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  wss.sendDataUsingWebRTCSignallling({
    connectedUserSocketId: connectedUserDetails.socketId,
    type: constants.webRTCSignalling.ANSWER,
    answer: answer
  });
};

export const handleWebRTCAnswer = async (data) => {
  console.log("handling webRtc Answer");
  await peerConnection.setRemoteDescription(data.answer);
};

export const handleWebRTCCandidate = async (data) => {
  console.log("handling incoming webRTC candidate");
  try {
    await peerConnection.addIceCandidate(data.candidate);
  } catch (err) {
    console.error(
      "error occured when trying to add received ice candidate",
      err
    );
  }
};

let screenSharingStream;

export const switchBetweenCameraAndScreenSharing = async (
  screenSharingActive
) => {
  if (screenSharingActive) {
    const localStream = store.getState().localStream;
    const senders = peerConnection.getSenders();

    const sender = senders.find((sender) => {
      return sender.track.kind === localStream.getVideoTracks()[0].kind;
    });

    if (sender) {
      sender.replaceTrack(localStream.getVideoTracks()[0]);
    }

    // stop screen sharing stream
    store
      .getState()
      .screenSharingStream.getTracks()
      .forEach((track) => track.stop());

    store.setScreenSharingActive(!screenSharingActive);
    ui.updateLocalVideo(localStream);
  } else {
    console.log("switching for screen sharing");
    try {
      screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });
      store.setScreenSharingStream(screenSharingStream);

      //replace track which sendere is sending
      const senders = peerConnection.getSenders();

      const sender = senders.find((sender) => {
        return (
          sender.track.kind === screenSharingStream.getVideoTracks()[0].kind
        );
      });

      if (sender) {
        sender.replaceTrack(screenSharingStream.getVideoTracks()[0]);
      }

      store.setScreenSharingActive(!screenSharingActive);
      ui.updateLocalVideo(screenSharingStream);
    } catch (err) {
      console.error(
        "error occured when trying to get screen sharing stream",
        err
      );
    }
  }
};

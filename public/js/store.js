//const NodeRSA = require('node-rsa');
//import NodeRSA from 'node-rsa';


let state = {
    //we dont know the intial state
    socketId: null,
    localStream: null,
    remoteStream: null,
    screenSharingStream: null,
    screenSharingActive: false,
};


export const setSocketId = (socketId) => {
    state = {
        //previous state copied
        ...state,
        socketId: socketId,
    };
    console.log("state");
    console.log(state);
};

export const setLocalStream = (stream) => {
    state = {
        //previous state copied
        ...state,
        localStream: stream
    };
    //console.log(state);
};


export const setScreenSharingActive = (screenSharingActive) => {
    state = {
        ...state,
        screenSharingActive
    };
};

export const setScreenSharingStream = (stream) => {
    state = {
        ...state,
        screenSharingStream: stream
    };
};

export const setRemoteStream = (stream) => {
    state = {
        //previous state copied
        ...state,
        remoteStream: stream,
    };
    //console.log(state);
};

export const getState = () => {
    return state;
};
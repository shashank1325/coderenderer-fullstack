import React, { useEffect, useState, useRef } from "react";
import ACTIONS from "../Actions";
import Client from "../components/Client";
import Editor from "../components/Editor";
import { initSocket } from "../socket";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { useNavigate, Navigate, useParams } from "react-router-dom";
import Modals from "../components/Modals";
import axios from "axios";
const EditorPage = () => {
	const codeRef = useRef(null);
	const socketRef = useRef();
	const location = useLocation();
	const { roomId } = useParams();
	const reactNavigator = useNavigate();
	const [clients, setClients] = useState([]);
	const [showModal, setShowModal] = useState(false);
	const [output, setOutput] = useState("");
	const [language, setLanguage] = useState("javascript");

	useEffect(() => {
		const init = async () => {
			socketRef.current = await initSocket();

			//for error handling
			socketRef.current.on("connect_error", (err) => handleErrors(err));
			socketRef.current.on("connect_failed", (err) => handleErrors(err));
			function handleErrors(err) {
				console.log("socket error", err);
				toast.error("Socket connection failed, try again later.");
				reactNavigator("/");
			}
			//error handling end

			socketRef.current.emit(ACTIONS.JOIN, {
				roomId,
				username: location.state?.userName,
			});

			//listening for joined event
			socketRef.current.on(ACTIONS.JOINED, ({ username, socketId, clints }) => {
				//console.log(username, location.state?.userName);
				//console.log(username==location.state?.userName);
				//console.log(clints);
				//console.log(socketId);
				//setClients(clints);
				if (username !== location.state?.userName) {
					//console.log("joined", username,location.state?.userName);
					toast.success(`${username} joined the room`);
				}

				setClients(clints);
				//for sync
				socketRef.current.emit(ACTIONS.SYNC_CODE, {
					code: codeRef.current,
					socketId,
				});
			});

			//listening for disconnected event
			socketRef.current.on(ACTIONS.DISCONNECTED, ({ username, socketId }) => {
				//console.log("disconnected", username, socketId);
				toast.success(`${username} disconnected`);
				setClients((prev) => {
					return prev.filter((client) => client.socketId !== socketId);
				});
			});
		};
		init();
		return () => {
			socketRef.current.disconnect();
			socketRef.current.off(ACTIONS.JOINED);
			socketRef.current.off(ACTIONS.DISCONNECTED);
		};
	}, []);

	const copyRoomId = async () => {
		try {
			await navigator.clipboard.writeText(roomId);
			toast.success("Room Id copied to clipboard");
		} catch (err) {
			toast.error("Failed to copy room id");
			console.log(err);
		}
	};

	const leaveRoom = () => {
		reactNavigator("/");
	};

	const fetchCode = () => {
		if (codeRef.current != null) {
			axios({
				method: "post",
				url: "http://localhost:5000/code",
				data: {
					code: codeRef.current,
					language:language
				},
			})
				.then((response) => {
					setOutput(response.data.output.replace(/\n/g, "<br/>"));
					setShowModal(true);
				})
				.catch((err) => {
					console.log("Error Happening");
					console.log(err);
				});
		}
	};

	
	

	if (!location.state) {
		console.log("redirect hosse homepage e bcz username nai");
		return <Navigate to="/" />;
	}

	return (
		<>
			{/* modal part start */}
			<Modals
				showModal={showModal}
				close={() => setShowModal(false)}
				output={output}
			/>
			{/* modal part end */}

			<div className="mainWrap">
				<div className="sidepanel">
					{/* sidepanel header part */}
					<div className="sidepanel-header">
						<div className="sidepanel-header-logo">
							<img className="logoImage" src="/code-sync.png" alt="logo" />
						</div>
						<div className="sidepanel-header-title">
							<h4 className="connect blink_me">Active Now</h4>
						</div>

						{/* clint part */}
						<div className="sidepanel-header-userList">
							{clients.map((client, index) => (
								<Client key={client.socketId} username={client.username} />
							))}
						</div>
						{/* clint part end */}
					</div>
					{/* sidepanel header part end */}

					{/* sidepanel footer part */}

					<div className="radioControl" onChange={(e)=>setLanguage(e.target.value)}>
						<input type="radio" value="javascript" name="lang"  defaultChecked/> Js
						<input type="radio" value="python" name="lang" /> Python
					</div>

					<button className="btn runBtn" onClick={() => fetchCode()}>
						Run Code
					</button>

					<button className="btn copyBtn" onClick={copyRoomId}>
						Copy Room ID
					</button>
					<button className="btn leaveBtn" onClick={leaveRoom}>
						Leave Room
					</button>

					{/* sidepanel footer part end */}
				</div>

				{/* editor panel start */}
				<div className="editorWrap">
					<Editor
						socketRef={socketRef}
						roomId={roomId}
						onCodeChange={(code) => {
							codeRef.current = code;
						}}
						language={language}
					/>
				</div>
				{/* editor panel end */}
			</div>
		</>
	);
};

export default EditorPage;

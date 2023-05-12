import {
  IBlobEvent,
  IMediaRecorder,
  MediaRecorder,
  register,
} from "extendable-media-recorder";
import { connect } from "extendable-media-recorder-wav-encoder";
import ky from "ky";
import { useState, useEffect, useRef } from "react";
import { Button, Container, Card, Form, Row } from "react-bootstrap";
import Spinner from "react-bootstrap/Spinner";

const api = ky.extend({
  prefixUrl:
    process.env.NODE_ENV === "development"
      ? "http://localhost:4000"
      : "http://54.211.18.10:4000",
});
const mimeType = "audio/wav";

interface IData {
  fileName: string;
  transcript: string;
}

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingMessage, setRecordingMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [data, setData] = useState<IData>({
    fileName: "",
    transcript: "",
  });
  const [reloadData, setReloadData] = useState<boolean>(true);

  const mediaRecorder = useRef<IMediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const mediaStream = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (reloadData) {
      setReloadData(false);
      api
        .get("")
        .json<IData>()
        .then((data) => {
          if (data) {
            setData(data);
          } else {
            setIsComplete(true);
          }
        });
    }
  }, [reloadData]);

  useEffect(() => {
    const startRecording = async () => {
      try {
        if (!mediaRecorder.current) {
          await register(await connect());

          mediaStream.current = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          const mediaRecoderObject = new MediaRecorder(mediaStream.current, {
            mimeType,
          });

          mediaRecorder.current = mediaRecoderObject;

          mediaRecorder.current.addEventListener(
            "dataavailable",
            handleDataAvailable
          );
        }

        mediaRecorder.current.start();
      } catch (err) {
        console.error("Error starting recording:", err);
        setIsRecording(false);
      }
    };

    if (isRecording) {
      startRecording();
      setRecordingMessage("Audio is recording");
    } else {
      if (mediaRecorder.current) {
        mediaRecorder.current.stop();
      }
      setRecordingMessage("");
    }
  }, [isRecording]);

  const handleDataAvailable = (event: IBlobEvent) => {
    if (event.data.size > 0) {
      audioChunks.current.push(event.data);
      setRecordedChunks([...audioChunks.current]);
    }
  };

  const onReset = () => {
    setRecordedChunks([]);
  };

  const onSubmit = async () => {
    setIsSubmitting(true);
    if (recordedChunks.length === 0) {
      console.warn("No audio recorded");
      return;
    }

    const file = new File(recordedChunks, data.fileName, { type: mimeType });
    const formData = new FormData();
    formData.set("fileName", `${data.fileName}.wav`);
    formData.set("recording", file);

    await api.post(`submit?fileName=${data.fileName}`, {
      body: formData,
    });
    setReloadData(true);
    setIsSubmitting(false);
    setRecordedChunks([]);
    if (mediaStream.current) {
      mediaStream.current
        .getTracks() // get all tracks from the MediaStream
        .forEach((track) => track.stop());
    }
  };
  return (
    <Container>
      <Row>
        <Card className="mt-3">
          <Card.Header>
            <h1>Audio Transcript</h1>
            {isComplete && (
              <Card.Subtitle className="mb-2 text-muted" as="h6">
                All completed
              </Card.Subtitle>
            )}
          </Card.Header>
          <Card.Body>
            <Form>
              <Form.Group controlId="fileName">
                <Form.Label>Filename:</Form.Label>
                <Form.Control
                  type="text"
                  value={data.fileName}
                  readOnly={true}
                />
              </Form.Group>
              <Form.Group controlId="transcript">
                <Form.Label>Transcript:</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={data.transcript}
                  readOnly={true}
                />
              </Form.Group>
              <Form.Group>
                <Form.Label>Audio:</Form.Label>
                {recordedChunks.length > 0 ? (
                  <audio
                    src={URL.createObjectURL(
                      new Blob(recordedChunks, { type: mimeType })
                    )}
                    controls
                  />
                ) : (
                  <span>No audio recorded</span>
                )}
              </Form.Group>
              <Button
                variant="primary"
                onClick={() => setIsRecording(true)}
                disabled={isComplete || isRecording}
              >
                Start Recording
              </Button>{" "}
              <Button
                variant="primary"
                onClick={() => setIsRecording(false)}
                disabled={!isRecording}
              >
                Stop Recording
              </Button>{" "}
              {recordedChunks.length > 0 && (
                <Button variant="primary" onClick={onReset}>
                  Record Again
                </Button>
              )}
              <br></br>{" "}
              <div>
                <Button
                  className="mt-3"
                  onClick={onSubmit}
                  disabled={isComplete || isSubmitting}
                >
                  Submit
                </Button>
              </div>
              {isSubmitting && <Spinner></Spinner>}
              <div>{recordingMessage}</div>
            </Form>
          </Card.Body>
        </Card>
      </Row>
    </Container>
  );
}

export default App;

import ky from "ky";
import { useEffect, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Card,
  Form,
  Row,
  Spinner,
} from "react-bootstrap";
import { useReactMediaRecorder } from "react-media-recorder-2";

const prefixUrl =
  process.env.NODE_ENV === "development"
    ? "http://localhost:4000"
    : "http://54.211.189.120:4000";
const api = ky.extend({
  prefixUrl,
});
const mimeType = "audio/wav";

interface IData {
  fileName: string;
  transcript: string;
}

function App() {
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isComplete, setIsComplete] = useState<boolean>(false);
  const [data, setData] = useState<IData>({
    fileName: "",
    transcript: "",
  });
  const [reloadData, setReloadData] = useState<boolean>(true);
  const { clearBlobUrl, status, startRecording, stopRecording, mediaBlobUrl } =
    useReactMediaRecorder({
      audio: {
        sampleRate: 22050,
        channelCount: 1,
      },
      mediaRecorderOptions: {
        mimeType: mimeType,
      },
    });

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

  const onSubmit = async () => {
    if (!mediaBlobUrl) {
      console.warn("No audio recorded");
      return;
    }

    setIsSubmitting(true);
    const audioBlob = await fetch(mediaBlobUrl).then((r) => r.blob());
    const file = new File([audioBlob], data.fileName, { type: mimeType });
    const formData = new FormData();
    formData.set("fileName", `${data.fileName}.wav`);
    formData.set("recording", file);

    await api.post(`submit?fileName=${data.fileName}`, {
      body: formData,
    });
    setReloadData(true);
    setIsSubmitting(false);
    clearBlobUrl();
  };
  return (
    <Container>
      <Row>
        <Card className="mt-3">
          <Card.Header>
            <h1>
              Audio Transcript <Badge bg="secondary">{status}</Badge>
            </h1>
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
                <Form.Label>Audio</Form.Label>
                {mediaBlobUrl ? (
                  <audio src={mediaBlobUrl} controls={true} />
                ) : (
                  <span>No audio recorded</span>
                )}
              </Form.Group>
              <Button
                variant="primary"
                onClick={startRecording}
                disabled={
                  isComplete || (status !== "idle" && status !== "stopped")
                }
                className="ml-2"
              >
                Start Recording
              </Button>
              <Button
                variant="primary"
                onClick={stopRecording}
                disabled={status !== "recording"}
                className="ml-2"
              >
                Stop Recording
              </Button>
              {mediaBlobUrl && (
                <Button variant="primary" onClick={clearBlobUrl}>
                  Clear recording
                </Button>
              )}
              <br></br>
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
            </Form>
          </Card.Body>
        </Card>
      </Row>
    </Container>
  );
}

export default App;

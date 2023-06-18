import React, { useRef, useState } from "react";
import logo from "./logo.svg";
import { upload } from "@spheron/browser-upload";
import "./Upload.css";
import lit from "./lit";

function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadLink, setUploadLink] = useState("");
  const [dynamicLink, setDynamicLink] = useState("");
  const [decryptIpfs, setDecryptIpfs] = useState("");

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files ? event.target.files[0] : null;
    setFile(selectedFile);
    setUploadLink("");
    setDynamicLink("");
  };

  const handleSelectFile = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert("No file selected");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:8111/initiate-upload");
      const responseJson = await response.json();
      const uploadResult = await upload([file], {
        token: responseJson.uploadToken,
      });

      setUploadLink(uploadResult.protocolLink);
      setDynamicLink(uploadResult.dynamicLinks[0]);
    } catch (err) {
      alert(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEncryptUpload = async () => {
    if (!file) {
      alert("No file selected");
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch("http://localhost:8111/initiate-upload");
      const responseJson = await response.json();
      const uploadResult = await lit.encryptFile(file, {
        token: responseJson.uploadToken,
      });

      setUploadLink(uploadResult.protocolLink);
      setDynamicLink(uploadResult.dynamicLinks[0]);
    } catch (err) {
      alert(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptDownload = async () => {
    if (!decryptIpfs) {
      alert("No ipfs entered");
      return;
    }

    try {
      setIsLoading(true);

      const fileBlob = await lit.decryptFile(decryptIpfs);
      generateFileFromUint8Array(fileBlob, `abcd-${fileType}`);
    } catch (err) {
      alert(err);
    } finally {
      setIsLoading(false);
    }
  };

  function generateFileFromUint8Array(
    uint8Array: string | Uint8Array,
    fileName: string
  ) {
    // Create a Blob from the Uint8Array
    const blob = new Blob([uint8Array]);

    // Create a URL for the Blob
    const url = URL.createObjectURL(blob);

    // Create a link element
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;

    // Append the link to the document body
    document.body.appendChild(link);

    // Simulate a click on the link to trigger the download
    link.click();

    // Clean up by removing the link and revoking the URL
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="App">
      <header className="App-header">
        {/* <img src={logo} className="App-logo" alt="logo" /> */}
        {isLoading ? (
          <>Uploading...</>
        ) : (
          <>
            <p>Upload .car file to IPFS</p>
            <div className="flex gap-32">
              <>
                <div className="">
                  <div
                  className="button-con button-53 h-12"
                    onClick={handleSelectFile}
                  >
                    Select
                    <input
                      id="file"
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      className="w-full h-full"
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                <div className="flex flex-col">
                  <div
                    className="button-con button-53 h-12"
                    onClick={handleUpload}
                  >
                    Direct
                  </div>

                </div>
                <div className="flex flex-col">
                  <div
                    className="button-con button-53 h-12"
                    onClick={handleEncryptUpload}
                  >
                    Encrypt
                  </div>

                </div>
              </>


            </div>
          </>
        )}
      </header>
      <div>
        <div>
          {uploadLink && (
            <a
              className="box"
              href={uploadLink}
              target="__blank"

            >
              {uploadLink}
            </a>
          )}
        </div>
        <div style={{ marginTop: "5%" }}>
          {dynamicLink && (
            <a
              className="box"
              href={`https://${dynamicLink}`}
              target="__blank"
            >
              ⚡️ {dynamicLink}
            </a>
          )}
        </div>

      </div>
    </div>
  );
}

export default Upload;

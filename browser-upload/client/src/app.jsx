import React, { useEffect, useState } from "react";
import { CarWriter } from "@ipld/car";
import { importer } from "ipfs-unixfs-importer";
import browserReadableStreamToIt from "browser-readablestream-to-it";
import { CommP } from "@web3-storage/data-segment";

export default function App() {
  const [files, setFiles] = useState([]);
  const [rootCid, setRootCid] = useState();
  const [carSize, setCarSize] = useState();
  const [pieceSize, setPieceSize] = useState();
  const [pieceCID, setPieceCID] = useState();

  return (
    <div>
      <header className="db">
        <h1 className="dib pa3 ma0 lh-tight">
          <a className="link db f4 fw7 near-black" href=".">
            Data <span className="blue fw5">NEXUS</span>
          </a>
          <span className="db f6 fw6 silver">Gateway to FVM data deals</span>
        </h1>
      </header>
      <section className="tc">
        <p className="ma0 pv3 ph2 mw7 center f4 fw6 lh-copy dark-gray">
          Upload your data and make it ready for
          <a
            className="blue link underline-hover ml1"
            href="https://ipld.io/specs/transport/car/"
          >
            <span className="nowrap">storing it on </span> FVM
          </a>
        </p>

        <div className="mw6 center mt4">
          <FileForm files={files} setFiles={setFiles} />
        </div>
        {files && files.length ? (
          <div>
            <div className="mw6 center tl bg-light-gray black pt2 pb3 ph3 fw4 f7 overflow-y-scroll">
              <label className="db">
                <a
                  className="ttu blue fw6 link"
                  herf="https://docs.ipfs.io/concepts/content-addressing/"
                >
                  IPFS CID
                </a>
              </label>
              <code>{rootCid ? rootCid.toString() : "..."}</code>
            </div>

            <div className="mw6 center tl bg-light-gray black pt2 pb3 ph3 fw4 f7 overflow-y-scroll">
              <label className="db">
                <a
                  className="ttu blue fw6 link"
                  herf="https://docs.ipfs.io/concepts/content-addressing/"
                >
                  CAR SIZE
                </a>
              </label>
              <code>{carSize ? carSize : "..."}</code>
            </div>

            <div className="mw6 center tl bg-light-gray black pt2 pb3 ph3 fw4 f7 overflow-y-scroll">
              <label className="db">
                <a
                  className="ttu blue fw6 link"
                  herf="https://docs.ipfs.io/concepts/content-addressing/"
                >
                  PIECE SIZE
                </a>
              </label>
              <code>{pieceSize ? pieceSize : "..."}</code>
            </div>

            <div className="mw6 center tl bg-light-gray black pt2 pb3 ph3 fw4 f7 overflow-y-scroll">
              <label className="db">
                <a
                  className="ttu blue fw6 link"
                  herf="https://docs.ipfs.io/concepts/content-addressing/"
                >
                  PIECE CID
                </a>
              </label>
              <code>{pieceCID ? pieceCID : "..."}</code>
            </div>
            <CarDownloadLink
              files={files}
              rootCid={rootCid}
              setRootCid={setRootCid}
              setCarSize={setCarSize}
              setPieceSize={setPieceSize}
              setPieceCID={setPieceCID}
              className="db mt4 pa3 mw5 center white link bg-blue f5 fw6 br1"
            >
              Download .car file
            </CarDownloadLink>
          </div>
        ) : null}
      </section>
      {files && files.length ? (
        <div>
          <section class="mw6 center ph3 ph4-ns pv3 lh-tight">
            <img src="https://d15k2d11r6t6rl.cloudfront.net/public/users/Integrators/4ff5a532-53bb-47db-a932-ebe0310801c6/jsh/scroll_down.gif" />
          </section>
        </div>
      ) : null}
    </div>
  );
}

async function readFileAsUint8Array(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const arrayBuffer = reader.result;
      if (arrayBuffer != null) {
        if (typeof arrayBuffer === "string") {
          const uint8Array = new TextEncoder().encode(arrayBuffer);
          resolve(uint8Array);
        } else if (arrayBuffer instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(arrayBuffer);
          resolve(uint8Array);
        }
        return;
      }
      reject(new Error("arrayBuffer is null"));
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
}

const generateCommP = async (bytes, setPieceSize, setPieceCID) => {
  const commP = await CommP.build(bytes);
  const pieceSize = commP.pieceSize;
  setPieceSize(pieceSize);
  // Gives you a commP as a CID
  const cid = commP.link();
  setPieceCID(cid.toString());
};

function CarDownloadLink({
  files,
  className,
  children,
  setRootCid,
  rootCid,
  setCarSize,
  setPieceSize,
  setPieceCID,
}) {
  const [carUrl, setCarUrl] = useState();

  useEffect(() => {
    async function fetchData() {
      if (!files || files.length === 0) return;
      const { root, car } = await createCarBlob(files);
      if (car) {
        console.log(car);
        setCarSize(car.size);
        setCarUrl(URL.createObjectURL(car));
        setRootCid(root);
      }
      await generateCommP(
        await readFileAsUint8Array(files[0]),
        setPieceSize,
        setPieceCID
      );
    }
    fetchData();
  }, [files]);

  return carUrl ? (
    <a className={className} href={carUrl} download={`${rootCid}.car`}>
      {children}
    </a>
  ) : null;
}

function FileForm({ files = [], setFiles }) {
  return (
    <form style={{ opacity: files.length ? 0.8 : 1 }}>
      {files.length ? null : (
        <label className="db mh2 mh0-ns pv3 link pointer glow o-90 bg-blue white relative br1">
          <span className="fw6 f5">Upload File</span>
          <input
            className="dn"
            type="file"
            multiple
            onChange={onFileInput.bind(null, setFiles)}
          />
        </label>
      )}
    </form>
  );
}

function onFileInput(setFiles, evt) {
  evt.preventDefault();
  evt.stopPropagation();
  const fileList = evt && evt.target && evt.target.files;
  const files = [];
  for (const file of fileList) {
    files.push(file);
  }
  console.log("adding", files);
  setFiles(files);
}

async function createCarBlob(files) {
  if (!files || !files.length) return;
  if (files.car) return;
  const carParts = [];
  const { root, out } = await fileListToCarIterator(files);
  for await (const chunk of out) {
    carParts.push(chunk);
  }
  const car = new Blob(carParts, {
    type: "application/car",
  });
  return { root, car };
}

class MapBlockStore {
  constructor() {
    this.store = new Map();
  }
  *blocks() {
    for (const [cid, bytes] of this.store.entries()) {
      yield { cid, bytes };
    }
  }
  put({ cid, bytes }) {
    return Promise.resolve(this.store.set(cid, bytes));
  }
  get(cid) {
    return Promise.resolve(this.store.get(cid));
  }
}

export async function fileListToCarIterator(
  fileList,
  blockApi = new MapBlockStore()
) {
  const fileEntries = [];
  for (const file of fileList) {
    fileEntries.push({
      path: file.name,
      content: browserReadableStreamToIt(file.stream()),
    });
  }

  const options = {
    cidVersion: 1,
    wrapWithDirectory: true,
    rawLeaves: true,
  };
  const unixFsEntries = [];
  for await (const entry of importer(fileEntries, blockApi, options)) {
    unixFsEntries.push(entry);
  }

  const root = unixFsEntries[unixFsEntries.length - 1].cid;
  const { writer, out } = CarWriter.create(root);
  for (const block of blockApi.blocks()) {
    writer.put(block);
  }
  writer.close();
  console.log(root.toString());
  console.log(out);
  return { root, out };
}

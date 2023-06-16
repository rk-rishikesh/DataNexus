import React, { useEffect, useState } from "react";
import { CarWriter } from "@ipld/car";
import { importer } from "ipfs-unixfs-importer";
import browserReadableStreamToIt from "browser-readablestream-to-it";
import { CommP } from "@web3-storage/data-segment";
import Upload from "./Upload";
import logo from "./logo.svg";

// CONTRACT
import contract from "./contracts/DealClient.json";
import "react-tooltip/dist/react-tooltip.css";
import { ethers } from "ethers";
const CID = require("cids");
const contractAddress = "0xf4E0C74D76Bf324293bB3B3DA184d164d06F7664";
const contractABI = contract.abi;
let dealClient;
let cid;

export default function App() {
  const [files, setFiles] = useState([]);
  const [rootCid, setRootCid] = useState();
  const [carSize, setCarSize] = useState();
  const [pieceSize, setPieceSize] = useState();
  const [pieceCID, setPieceCID] = useState();
  const [wallet, setWallet] = useState("");
  const [one, setOne] = useState(true); // commp generation
  const [two, setTwo] = useState(false); // car link generation
  const [three, setThree] = useState(false); // contract interaction
  const [carLink, setCarLink] = useState("");
  const [errorMessageSubmit, setErrorMessageSubmit] = useState("");
  const [txSubmitted, setTxSubmitted] = useState("");
  const [dealID, setDealID] = useState("");
  const [proposingDeal, setProposingDeal] = useState(false);

  useEffect(() => {
    checkWalletIsConnected();
  }, []);

  const checkWalletIsConnected = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }
    const provider = new ethers.BrowserProvider(ethereum);
    const network = await provider.getNetwork();

    console.log(network.chainId);

    ethereum.request({ method: "eth_accounts" }).then((accounts) => {
      if (accounts.length !== 0) {
        const account = accounts[0];
        console.log("Found an account:", account);
        setWallet(account);
      } else {
        console.log("No account found");
      }
    });
  };

  const connectWalletHandler = () => {
    const { ethereum } = window;
    if (!ethereum) {
      alert("Get MetaMask!");
      return;
    }
    ethereum
      .request({ method: "eth_requestAccounts" })
      .then((accounts) => {
        console.log("Connected", accounts[0]);
      })
      .catch((err) => console.log(err));
  };

  const setUpThree = () => {
    setThree(true);
    setTwo(false);
    handleSubmit();
  };

  const handleChangeCarLink = (event) => {
    // validate input data here
    console.log(event.target.value);
    setCarLink(event.target.value);
  };

  const handleSubmit = async () => {
    // This will be handling deal proposal submission sometime in the future.

    // do something with the carLink value, like send it to a backend API
    console.log(pieceCID);
    console.log(carLink);
    console.log(pieceSize);
    console.log(carSize);

    try {
      setErrorMessageSubmit("");
      cid = new CID(pieceCID);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.BrowserProvider(ethereum);
        const signer = await provider.getSigner();
        dealClient = new ethers.Contract(contractAddress, contractABI, signer);
        const extraParamsV1 = [
          carLink,
          carSize,
          false, // taskArgs.skipIpniAnnounce,
          false, // taskArgs.removeUnsealedCopy
        ];
        const DealRequestStruct = [
          cid.bytes, //cidHex
          pieceSize, //taskArgs.pieceSize,
          false, //taskArgs.verifiedDeal,
          pieceCID, //taskArgs.label,
          520000, // startEpoch
          1555200, // endEpoch
          0, // taskArgs.storagePricePerEpoch,
          0, // taskArgs.providerCollateral,
          0, // taskArgs.clientCollateral,
          1, //taskArgs.extraParamsVersion,
          extraParamsV1,
        ];

        console.log(DealRequestStruct);

        console.log(dealClient.interface);
        const transaction = await dealClient.makeDealProposal(
          DealRequestStruct
        );
        console.log("Proposing deal...");
        setProposingDeal(true);
        const receipt = await transaction.wait();
        console.log(receipt);
        setProposingDeal(false);
        setTxSubmitted("Transaction submitted! " + receipt.hash);

        dealClient.on("DealProposalCreate", (id, size, verified, price) => {
          console.log(id, size, verified, price);
        });

        console.log("Deal proposed! CID: " + cid);
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
      setErrorMessageSubmit(
        "Something went wrong. " + error.name + " " + error.message
      );
      return;
    }
  };

  const dealIDHandler = async () => {
    setDealID("Waiting for acceptance by SP...");
    console.log(pieceCID);
    cid = new CID(pieceCID);
    var refresh = setInterval(async () => {
      console.log(cid.bytes);
      if (cid === undefined) {
        setDealID("Error: CID not found");
        clearInterval(refresh);
      }
      console.log("Checking for deal ID...");
      const dealID = await dealClient.pieceDeals(cid.bytes);
      console.log(dealID);
      if (dealID !== undefined && dealID !== "0") {
        // If your deal has already been submitted, you can get the deal ID by going to https://calibration.filfox.info/en/deal/<dealID>
        // The link will show up in the frontend: once a deal has been submitted, its deal ID stays constant. It will always have the same deal ID.
        setDealID("https://calibration.filfox.info/en/deal/" + dealID);
        clearInterval(refresh);
      }
    }, 5000);
  };

  return (
    <div>
      <header className="db">
        <h1 className="dib pa3 ma0 lh-tight">
          <a className="link db f4 fw7 near-black" href=".">
            Data <span className="blue fw5">NEXUS</span>
          </a>

          <span className="db f6 fw6 silver">Gateway to FVM data deals</span>
        </h1>
        <button
          className="button-con button-50 h-12"
          onClick={connectWalletHandler}
        >
          {wallet != "" ? wallet : "Connect Wallet"}
        </button>
      </header>

      {one && (
        <section className="tc mt5">
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
                setOne={setOne}
                setTwo={setTwo}
                className="db mt4 pa3 mw5 center white link bg-blue f5 fw6 br1"
              >
                Download .car file
              </CarDownloadLink>
            </div>
          ) : null}
        </section>
      )}

      {two && (
        <>
          <Upload />
          <div className="mw6 center mt4">
            <label className="tc db mh2 mh0-ns pv3 link pointer glow o-90  white relative br1">
              <input
                className="tc db mh2 mh0-ns pv3 relative br1"
                type="text"
                value={carLink}
                placeholder="Enter the CAR link here"
                style={{ width: "100%", color: "black" }}
                onChange={handleChangeCarLink}
              ></input>
            </label>
            <label className="tc db mh2 mh0-ns pv3 link pointer glow o-90 bg-blue white relative br1">
              <a
                onClick={() => {
                  setUpThree();
                }}
              >
                Create Deal
              </a>
            </label>
          </div>
        </>
      )}
      {three ? (
        <div className="mw6 center mt4">
          <div className="mw4 center mt4">
            <img src={logo} className="App-logo" alt="logo" />
          </div>
          <div className="center mt4">
            <a className="boxx">{txSubmitted} </a>
          </div>
          <div className="mw6 center mt4">
            <label className="tc db mh2 mh0-ns pv3 link pointer glow o-90 bg-blue white relative br1">
              <a
                onClick={() => {
                  dealIDHandler();
                }}
              >
                Get Deal ID
              </a>
            </label>
            <div className="center mt4">
              <a className="boxx">{dealID} </a>
            </div>
          </div>
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
  setOne,
  setTwo,
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
    <a
      className={className}
      href={carUrl}
      download={`${rootCid}.car`}
      onClick={() => {
        setOne(false);
        setTwo(true);
      }}
    >
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

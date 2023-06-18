import React, { useEffect, useState } from "react";
import { CarWriter } from "@ipld/car";
import { importer } from "ipfs-unixfs-importer";
import browserReadableStreamToIt from "browser-readablestream-to-it";
import { CommP } from "@web3-storage/data-segment";
import Upload from "./Upload";
import logo from "./logo.svg";
import lit from "./lit";
import {Link} from "react-router-dom"
// CONTRACT
import contract from "./contracts/DealClient.json";
import "react-tooltip/dist/react-tooltip.css";
import { ethers } from "ethers";

// PUSH
import * as PushAPI from "@pushprotocol/restapi";
import { Button, Drawer, Card } from "antd";

const CID = require("cids");
const contractAddress = "0xf4E0C74D76Bf324293bB3B3DA184d164d06F7664";
const contractABI = contract.abi;
let dealClient;
let cid;

const PK = "a36db6cd1e3bb4093a88918004bfbd66421ff264d8ed904090cf171a835bf084"; // channel private key
const Pkey = `0x${PK}`;
const _signer = new ethers.Wallet(Pkey);

export default function Deal() {
  const [files, setFiles] = useState([]);
  const [rootCid, setRootCid] = useState();
  const [carSize, setCarSize] = useState();
  const [pieceSize, setPieceSize] = useState();
  const [pieceCID, setPieceCID] = useState();
  const [carCID, setCarCID] = useState();
  const [wallet, setWallet] = useState("");
  const [one, setOne] = useState(true); // commp generation
  const [two, setTwo] = useState(false); // car link generation
  const [three, setThree] = useState(false); // contract interaction
  const [carLink, setCarLink] = useState("");
  const [errorMessageSubmit, setErrorMessageSubmit] = useState("");
  const [txSubmitted, setTxSubmitted] = useState(false);
  const [dealID, setDealID] = useState("");
  const [proposingDeal, setProposingDeal] = useState(false);
  const [open, setOpen] = useState(false);
  const [decryptIpfs, setDecryptIpfs] = useState("");

  const [notification, setNotification] = useState([]);

  useEffect(() => {
    checkWalletIsConnected();
  }, []);

  // PUSH

  const NotificationReceiver = async (props) => {
    console.log("d");
    const notifications = await PushAPI.user.getFeeds({
      user: `eip155:5:${wallet}`, // user address in CAIP
      env: "staging",
    });
    console.log("Hello");
    setNotification(notifications.slice(0, -7));
    console.log(notifications.slice(0, -7));
  };

  const showDrawer = () => {
    NotificationReceiver();
    setOpen(true);
  };

  const onClose = () => {
    setOpen(false);
  };

  const proposalCreatedNotification = async (
    transactionHash,
    clientAddress,
    carCID
  ) => {
    const jsonBody = JSON.stringify({
      tx: transactionHash,
      address: clientAddress,
      carCID: carCID,
    });
    try {
      const apiResponse = await PushAPI.payloads.sendNotification({
        signer: _signer,
        type: 1, // broadcast
        identityType: 2, // direct payload
        notification: {
          title: `Deal Proposal Created`,
          body: jsonBody,
        },
        payload: {
          title: `Deal Proposal Created`,
          body: jsonBody,
          cta: "",
          img: "",
        },
        channel: "eip155:5:0x11952291d864c06A1185A9BF3A7e3A37aeEd73ab", // your channel address
        env: "staging",
      });
    } catch (err) {
      console.error("Error: ", err);
    }
  };

  // WALLET

  const checkWalletIsConnected = async () => {
    const { ethereum } = window;
    if (!ethereum) {
      console.log("Make sure you have metamask!");
      return;
    } else {
      console.log("We have the ethereum object", ethereum);
    }
    const provider = new ethers.providers.Web3Provider(ethereum, "any");
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
        setWallet(accounts[0]);
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
    setCarCID(carLink.slice(8, -16));
    console.log(carLink);
    console.log(pieceSize);
    console.log(carSize);

    try {
      setErrorMessageSubmit("");
      cid = new CID(pieceCID);
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = await provider.getSigner();
        const dealClient = new ethers.Contract(
          contractAddress,
          contractABI,
          signer
        );
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
        console.log("Proposing deal...");
        setProposingDeal(true);
        try {
          const transaction = await dealClient.makeDealProposal(
            DealRequestStruct,
            {
              gasLimit: 1000000000, // BlockGasLimit / 10
            }
          );
          const receipt = await transaction.wait();
          console.log(transaction.hash);
          //   setTxLink("https://calibration.filfox.info/en/message/" + transaction.hash);
          proposalCreatedNotification(
            transaction.hash,
            wallet,
            carLink.slice(8, -16)
          );
        } catch (e) {
          console.log(e);
        }

        console.log("Hello");

        setProposingDeal(false);
        setTxSubmitted(true);

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
    setDealID("Waiting");
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

  const handleDecryptDownload = async (decryptIpfs) => {
    try {
      const fileBlob = await lit.decryptFile(decryptIpfs);
      generateFileFromUint8Array(fileBlob, `decrypted-data-nexus.car`);
    } catch (err) {
      alert(err);
    } finally {
    }
  };

  function generateFileFromUint8Array(uint8Array, fileName) {
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
    <div>
      <header className="db">
            
        <h1 className="dib pa3 ma0 lh-tight">
          <a className="link db f4 fw7 near-black" href="/nexus">
            <></> Data <span className="blue fw5">NEXUS</span>
          </a>
          <span className="db f6 fw6 silver">Gateway to FVM data deals</span>
        </h1>

       
        <button type="button" onClick={showDrawer} className="bell h-4">
          <img
            className="bell h-10"
            src="data:image/png;base64,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"
          />
        </button>
        <button
          className="button-con button-50 h-12"
          onClick={connectWalletHandler}
        >
          {wallet != "" ? wallet : "Connect Wallet"}
        </button>
       
        <Drawer
          title={
            <>
              <a className="link db f4 fw7 near-black" href=".">
                Data <span className="blue fw5">NEXUS</span>
              </a>
              <span className="db f6 fw6 silver">
                Notifications - Powered by Push
              </span>
            </>
          }
          width={"700px"}
          placement="right"
          onClose={onClose}
          open={open}
        >
          {notification.map((item, index) => {
            console.log(notification);
            console.log(JSON.parse(item["message"].toString()));
            console.log(JSON.parse(item["message"].toString()).tx);
            console.log(JSON.parse(item["message"].toString()).address);
            console.log(JSON.parse(item["message"].toString()).carCID);
            return (
              <Card
                key="key"
                className="mt-3"
                type="inner"
                title={item["title"]}
                extra={
                  <>
                    <a
                      href={
                        "https://calibration.filfox.info/en/message/" +
                        JSON.parse(item["message"].toString()).tx
                      }
                    >
                      <img
                        style={{ marginLeft: "90%", width: "10%" }}
                        src="https://fvm.filecoin.io/projects/icon-filfox.png"
                      />
                    </a>
                  </>
                }
              >
                <div></div>
                <div>
                  <a>
                    Your would be notified once the deal is accepted by the SP
                  </a>
                  <button
                    onClick={() => {
                      handleDecryptDownload(
                        JSON.parse(item["message"].toString()).carCID
                      );
                    }}
                  >
                    <img
                      style={{
                        marginLeft: "93%",
                        marginTop: "-6%",
                        width: "9%",
                      }}
                      src="https://thumbs.dreamstime.com/b/design-can-be-used-as-logo-icon-as-complement-to-design-fire-lock-logo-icon-design-126592120.jpg"
                    />
                  </button>
                </div>
              </Card>
            );
          })}
        </Drawer>
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
          {!txSubmitted && (
            <>
              <div className="mw4 center mt8">
                <img src={logo} className="App-logo" alt="logo" />
              </div>
              <div className="mw5 center mt8">
                <span>C R E A T I N G </span>&nbsp;&nbsp;&nbsp; D A T A
                &nbsp;&nbsp;&nbsp;<span>D E A L</span>
              </div>
            </>
          )}

          {txSubmitted && (
            <>
              <div className="tc center mt8" style={{ marginTop: "30%" }}>
                <img
                  className="tc center mt8"
                  src="https://www.lappymaker.com/images/greentick-unscreen.gif"
                />
                Transaction Successful
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
                {dealID != "" && (
                  <div className="tc center mt4">
                    {dealID == "Waiting" && (
                      <a>
                        <span>W A I T I N G </span>&nbsp;&nbsp;&nbsp; F O R
                        &nbsp;&nbsp;&nbsp;<span> A C C E P T A N C E</span>{" "}
                        &nbsp;&nbsp;&nbsp;<span> B Y</span>&nbsp;&nbsp;&nbsp;
                        <span> S P</span>
                      </a>
                    )}
                    {dealID != "Waiting" && <a className="boxx">{dealID}</a>}
                  </div>
                )}
              </div>
            </>
          )}
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
          <span className="fw6 f5">Select File</span>
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

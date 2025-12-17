import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CodamaExample } from "../target/types/codama_example";
import { getInitializeInstruction } from "../clients/js/src/generated";
import {
  Address,
  airdropFactory,
  appendTransactionMessageInstruction,
  createSolanaRpc,
  createSolanaRpcSubscriptions,
  createTransactionMessage,
  createTransactionPlanner,
  generateKeyPairSigner,
  getAddressEncoder,
  getProgramDerivedAddress,
  isSolanaError,
  lamports,
  pipe,
  sendAndConfirmTransactionFactory,
  sendTransactionWithoutConfirmingFactory,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  signTransactionMessageWithSigners,
  singleInstructionPlan,
  singleTransactionPlan,
  SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE,
} from "@solana/kit";

describe("codama-example", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.codamaExample as Program<CodamaExample>;
  // const provider = anchor.getProvider();
  const httpProvider = "http://127.0.0.1:8899";
  const wssProvider = "ws://127.0.0.1:8900";
  const rpc = createSolanaRpc(httpProvider);
  const rpcSubscriptions = createSolanaRpcSubscriptions(wssProvider);

  const sendTransaction = sendTransactionWithoutConfirmingFactory({ rpc });

  const addressEncoder = getAddressEncoder();
  it("Is initialized!", async () => {
    const payer = await generateKeyPairSigner();

    const LAMPORTS_PER_SOL = lamports(BigInt(10 ** 9));
    // const tx1 = await rpc
    //   .requestAirdrop(payer.address, LAMPORTS_PER_SOL)
    //   .send();

    const airdrop = airdropFactory({ rpc, rpcSubscriptions });
    const tx2 = await airdrop({
      commitment: "processed",
      lamports: LAMPORTS_PER_SOL,
      recipientAddress: payer.address,
    });

    const [dataAccount] = await getProgramDerivedAddress({
      programAddress: program.programId.toBase58() as Address,
      seeds: [Buffer.from("data"), addressEncoder.encode(payer.address)],
    });

    console.log("data account: ", dataAccount);

    const ix = getInitializeInstruction({
      count: 1,
      admin: payer,
      desc: "hi from codama!",
      dataAccount: dataAccount,
    });

    const instruction = singleInstructionPlan(ix);
    const transactionPlanner = createTransactionPlanner({
      createTransactionMessage: () =>
        pipe(createTransactionMessage({ version: 0 }), (message) =>
          setTransactionMessageFeePayerSigner(payer, message)
        ),
    });

    const transactionPlan = await transactionPlanner(instruction);
    const transaction = singleTransactionPlan({
      feePayer: payer,
      instructions: [ix],
      version: "legacy",
    });

    const { value: latestBlockHash } = await rpc.getLatestBlockhash().send();

    const transactionMessage = pipe(
      createTransactionMessage({ version: 0 }),
      (tx) => setTransactionMessageFeePayerSigner(payer, tx),
      (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockHash, tx),
      (tx) => appendTransactionMessageInstruction(ix, tx)
    );

    const signedTransaction = await signTransactionMessageWithSigners(
      transactionMessage
    );
    try {
      const tx = await sendTransaction(signedTransaction, {
        commitment: "confirmed",
      });
      console.log("Your transaction signature", tx);
    } catch (e) {
      if (
        isSolanaError(
          e,
          SOLANA_ERROR__JSON_RPC__SERVER_ERROR_SEND_TRANSACTION_PREFLIGHT_FAILURE
        )
      ) {
        console.error("The transaction failed in simulation", e.cause);
      } else {
        throw e;
      }
    }
  });
});

// first time trying kit,
// good random bs go session!
// all this just to send initialize ixn 😢

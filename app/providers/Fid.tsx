import { sdk } from "@farcaster/miniapp-sdk";
import { Fid } from "../interface";

const getFid = async (): Promise<Fid | undefined> => {
  const context = await sdk.context;
  return context?.user?.fid;
};

export default getFid;

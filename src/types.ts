import { TypedDataDomain, TypedDataField } from "ethers";

export type ChainInfo = {
    [chainName: string]: {
      chainId: number;
    };
 };

export interface IGelatoStruct {
    chainId: number;
    target: string;
    data: string;
    user: string;
    userNonce: number;
    userDeadline: number;
}

export type EIP712<T = Record<string, any>> = {
    domain: TypedDataDomain;
    types: Record<string, Array<TypedDataField>>;
    value: T;
};

export type Erc20PermitToSign = {
    types: Record<string, Array<TypedDataField>>;
    value: Record<string, any>;
    domain: TypedDataDomain;
};


export interface ERC2612PermitMessage {
    owner: string;
    spender: string;
    value: number | string;
    nonce: number | string;
    deadline: number | string;
  }
  
export const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
  ];
  
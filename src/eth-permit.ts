import { getChainId, call, signData, RSV } from './rpc';
import { hexToUtf8 } from './lib';
import { gelatoEIP712DomainTypeData, getGelatoRequestStruct } from './gelato';
import { EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA } from './gelato';
import { EIP712, Erc20PermitToSign, IGelatoStruct } from './types';
import { ethers } from 'ethers';

const MAX_INT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';

interface DaiPermitMessage {
  holder: string;
  spender: string;
  nonce: number;
  expiry: number | string;
  allowed?: boolean;
}

interface ERC2612PermitMessage {
  owner: string;
  spender: string;
  value: number | string;
  nonce: number | string;
  deadline: number | string;
}

interface Domain {
  name: string;
  version: string;
  chainId: number;
  verifyingContract: string;
}

const EIP712Domain = [
  { name: "name", type: "string" },
  { name: "version", type: "string" },
  { name: "chainId", type: "uint256" },
  { name: "verifyingContract", type: "address" },
];

export const createTypedERC2612Data = (message: ERC2612PermitMessage, domain: Domain) => {
  const typedData = {
    types: {
      EIP712Domain,
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain,
    message,
  };

  return typedData;
};

const NONCES_FN = '0x7ecebe00';
const NAME_FN = '0x06fdde03';

const zeros = (numZeros: number) => ''.padEnd(numZeros, '0');

const getTokenName = async (provider: any, address: string) =>
  hexToUtf8((await call(provider, address, NAME_FN)).substr(130));


const getDomain = async (provider: any, token: string | Domain, version: string = '1'): Promise<Domain> => {
  if (typeof token !== 'string') {
    return token as Domain;
  }

  const tokenAddress = token as string;

  const [name, chainId] = await Promise.all([
    getTokenName(provider, tokenAddress),
    getChainId(provider),
  ]);

  const domain: Domain = { name, version, chainId, verifyingContract: tokenAddress };
  return domain;
};

export const signERC2612Permit = async (
  provider: any,
  token: string | Domain,
  owner: string,
  spender: string,
  value: string | number = MAX_INT,
  deadline?: number,
  nonce?: number,
  version?: string,
): Promise<ERC2612PermitMessage & RSV> => {
  const tokenAddress = (token as Domain).verifyingContract || token as string;

  const message: ERC2612PermitMessage = {
    owner,
    spender,
    value,
    nonce: nonce === undefined ? await call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`) : nonce,
    deadline: deadline || MAX_INT,
  };

  const domain = await getDomain(provider, token, version);
  const typedData = createTypedERC2612Data(message, domain);
  const sig = await signData(provider, owner, typedData);

  return { ...sig, ...message };
};

export const getERC2612PermitTypeData = async (
  provider: any,
  token: string | Domain,
  owner: string,
  spender: string,
  value: string | number = MAX_INT,
  deadline?: number,
  nonce?: number,
  version?: string,
): Promise<any> => {
  const tokenAddress = (token as Domain).verifyingContract || token as string;

  const message: ERC2612PermitMessage = {
    owner,
    spender,
    value,
    nonce: nonce === undefined ? await call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`) : nonce,
    deadline: deadline || MAX_INT,
  };

  const domain = await getDomain(provider, token, version);
  const typedData = createTypedERC2612Data(message, domain);

  return typedData ;

};

export async function getSignERC20Permit(
  buyerAddress: string,
  paymentIntentResponse:any,
  provider: any
): Promise<Erc20PermitToSign> {

  const chain = paymentIntentResponse.chain;
  const contractAddress = paymentIntentResponse.contractAddress;
  const deadline: bigint = paymentIntentResponse.parameters['deadline'];
  const tokenAddress: string = paymentIntentResponse.parameters['paymentTokenAddress'];
  const amount: bigint = paymentIntentResponse.parameters['totalPrice'];

  if (!amount) throw new Error("No Amount set");
  
  const typeData = await getERC2612PermitTypeData(
    provider,
    tokenAddress,
    buyerAddress,
    contractAddress,
    Number(amount),
    Number(deadline)
  );

  const permitType = { Permit: typeData.types.Permit }

  return { domain: typeData.domain, types: permitType, value: typeData.message };
}

export async function buildPaymentTransaction(
  permitSignature: string,
  paymentIntentResponse: any,
  provider: any,
): Promise<EIP712<IGelatoStruct>> {

  const contractAddress = paymentIntentResponse.contractAddress;
  const functionName:string = paymentIntentResponse.functionName;
  const func = paymentIntentResponse.functionSignature;
  const chain = paymentIntentResponse.chain;
  const deadline = paymentIntentResponse.parameters.deadline;

  const splitPermitSignature = ethers.utils.splitSignature(permitSignature);

  const permitTransactionParams = [
     splitPermitSignature.v,
     splitPermitSignature.r,
     splitPermitSignature.s,
  ];

  const orderPropertiesToExtract = [
     'paymentTokenAddress',
     'fromAddress',
     'transfers',
     'totalPrice',
     'deadline',
  ]

  const distributionParams: any[] = [];
  orderPropertiesToExtract.forEach(key => {
      // Check if the property exists in the object
      if (paymentIntentResponse.parameters.hasOwnProperty(key)) {
          // Retrieve the value and push it into the orderedParams array
          distributionParams.push(paymentIntentResponse.parameters[key]);
      }
  });

  const functionCall =  { functionName, func, parameters: [ ...distributionParams, ...permitTransactionParams ] };

  return getGaslessTxToSign(
    chain,
    contractAddress,
    provider,
    functionCall,
    deadline 
  );
}

const getGaslessTxToSign = async (
  chain: number,
  contractAddress: string,
  provider: any,
  metaTxToSign: { functionName: string; func: string; parameters: any[] },
  deadline: number,
): Promise<EIP712<IGelatoStruct>> =>{
  const domain = gelatoEIP712DomainTypeData(chain);

  const types = { ...EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA };

  const value = await getGelatoRequestStruct(provider, chain, contractAddress, metaTxToSign, deadline);

  return { domain, types, value };
}

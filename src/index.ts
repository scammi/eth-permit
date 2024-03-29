import { ChainInfo, EIP712, Erc20PermitToSign, IGelatoStruct } from './types';
import { Signature, TypedDataDomain, ethers } from 'ethers';
import { getGaslessTxToSign } from './gelato';

export const MAX_INT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const ERC20_PERMIT_TYPE = {
  Permit: [
      {
          name: 'owner',
          type: 'address',
      },
      {
          name: 'spender',
          type: 'address',
      },
      {
          name: 'value',
          type: 'uint256',
      },
      {
          name: 'nonce',
          type: 'uint256',
      },
      {
          name: 'deadline',
          type: 'uint256',
      },
  ],
};

const ERC20_PERMIT_ABI_INTERFACE: ethers.InterfaceAbi = [
  'function EIP712_VERSION() view returns (string)',
  'function nonces(address) view returns (uint256)',
  'function name() view returns (string)',
];


export const getERC2612PermitTypeData = async (
  provider: any,
  token: string | TypedDataDomain,
  owner: string,
  spender: string,
  amount: bigint,
  deadline?: bigint,
): Promise<any> => {
  const tokenAddress = (token as TypedDataDomain).verifyingContract || token as string;

  const contract = new ethers.Contract(tokenAddress, ERC20_PERMIT_ABI_INTERFACE, provider);

  const [nonce, name, chainId] = await Promise.all([
      contract.nonces(owner),
      contract.name(),
      137,
  ]);

  let version: string;
  try {
      version = await contract.EIP712_VERSION();
  } catch (error) {
      version = '2' ;
  }

  const types = ERC20_PERMIT_TYPE;

  const value = {
      owner,
      spender,
      value: amount,
      nonce,
      deadline,
  };
  
  const domain = {
    name,
    version,
    chainId,
    verifyingContract: tokenAddress,
  };
  
  const erc20PermitToSign = {
    domain,
    types,
    value,
  };
  
  return erc20PermitToSign ;
};

export async function getSignERC20Permit(
  buyerAddress: string,
  paymentIntentResponse:any,
  provider: any
): Promise<Erc20PermitToSign> {

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
    amount,
    deadline 
  );

  const permitType = { Permit: typeData.types.Permit }

  return { domain: typeData.domain, types: permitType, value: typeData.value };
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
  const chainId: number = chainInfo[chain].chainId;

  const splitPermitSignature = Signature.from(permitSignature);

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

  const functionCall = { functionName, func, parameters: [ ...distributionParams, ...permitTransactionParams ] };

  return getGaslessTxToSign(
    chainId,
    contractAddress,
    provider,
    functionCall,
  );
}

const chainInfo: ChainInfo = {
  'polygon': {
    chainId: 137
  }
}

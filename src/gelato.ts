import { Contract, Interface } from 'ethers';
import gelatoAbi from './gelato-abi';
import { EIP712, IGelatoStruct } from './types';

export function gelatoEIP712DomainTypeData(chain: number) {
    return {
        name: 'GelatoRelay1BalanceERC2771',
        version: '1',
        verifyingContract: GELATO_RELAY_ADDRESS,
        chainId: chain,
    };
}

export const GELATO_RELAY_ADDRESS = '0xd8253782c45a12053594b9deB72d8e8aB2Fca54c'

export const EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA = {
    SponsoredCallERC2771: [
        { name: 'chainId', type: 'uint256' },
        { name: 'target', type: 'address' },
        { name: 'data', type: 'bytes' },
        { name: 'user', type: 'address' },
        { name: 'userNonce', type: 'uint256' },
        { name: 'userDeadline', type: 'uint256' },
    ],
};

export async function getGelatoRequestStruct(
    provider: any,
    chainId: number,
    target: string,
    metaTxToSign: { functionName: string; func: string; parameters: any[] },
    deadline: number,
): Promise<IGelatoStruct> {
    const signerAddress = await provider.getAddress();
    const relayerAddress = GELATO_RELAY_ADDRESS;

    const gelatoRelayerContract = new Contract(relayerAddress, gelatoAbi);
    const contract = gelatoRelayerContract.connect(provider);
    const userNonce: bigint = await (contract as any).userNonce(await provider.getAddress());
    
    let data;
    try {
        const iface = new Interface([metaTxToSign.func]);
        data = iface.encodeFunctionData(metaTxToSign.functionName, metaTxToSign.parameters);
    } catch (e) {
        console.log(e);
        throw new Error('could not create data');
    }

    const gelatoRequestStruct: IGelatoStruct = {
        chainId,
        target: target,
        data: data,
        user: signerAddress,
        userNonce: Number(userNonce),
        userDeadline: deadline,
    };

    return gelatoRequestStruct;
}

export const getGaslessTxToSign = async (
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
  
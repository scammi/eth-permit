import ethers, { BigNumber } from 'ethers';
import gelatoAbi from './gelato-abi';
import { Interface } from 'ethers/lib/utils';
import { IGelatoStruct } from './types';

export function gelatoEIP712DomainTypeData(chain: number) {
    return {
        name: 'GelatoRelay1BalanceERC2771',
        version: '1',
        verifyingContract: GELATO_RELAY_ADDRESS,
        chain,
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
    metaTxToSign: { functionName: string; func: string; parameters: any[] } | string,
    deadline: number,
): Promise<IGelatoStruct> {
    const signerAddress = await provider.getAddress();
    const relayerAddress = GELATO_RELAY_ADDRESS;
    const gelatoRelayerContract = new ethers.Contract(relayerAddress, gelatoAbi);
    const contract = gelatoRelayerContract.connect(provider);
    const userNonce: BigNumber = BigNumber.from(
        await (contract as any).userNonce(await provider.getAddress()),
    );

    let data: string;
    if (typeof metaTxToSign === 'string' || metaTxToSign instanceof String) {
        data = metaTxToSign as string;
    } else {
        try {
            const iface = new Interface([metaTxToSign.func]);
            data = iface.encodeFunctionData(metaTxToSign.functionName, metaTxToSign.parameters);
        } catch (e) {
            console.log(e);
        }
    }

    const gelatoRequestStruct: IGelatoStruct = {
        chainId,
        target: target,
        data: data,
        user: signerAddress,
        userNonce: userNonce.toNumber(),
        userDeadline: deadline,
    };

    return gelatoRequestStruct;
}
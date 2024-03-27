import { RSV } from './rpc';
import { EIP712, Erc20PermitToSign, IGelatoStruct } from './types';
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
export declare const createTypedERC2612Data: (message: ERC2612PermitMessage, domain: Domain) => {
    types: {
        EIP712Domain: {
            name: string;
            type: string;
        }[];
        Permit: {
            name: string;
            type: string;
        }[];
    };
    primaryType: string;
    domain: Domain;
    message: ERC2612PermitMessage;
};
export declare const signERC2612Permit: (provider: any, token: string | Domain, owner: string, spender: string, value?: string | number, deadline?: number | undefined, nonce?: number | undefined, version?: string | undefined) => Promise<ERC2612PermitMessage & RSV>;
export declare const getERC2612PermitTypeData: (provider: any, token: string | Domain, owner: string, spender: string, value?: string | number, deadline?: number | undefined, nonce?: number | undefined, version?: string | undefined) => Promise<any>;
export declare function getSignERC20Permit(buyerAddress: string, paymentIntentResponse: any, provider: any): Promise<Erc20PermitToSign>;
export declare function buildPaymentTransaction(permitSignature: string, paymentIntentResponse: any, provider: any): Promise<EIP712<IGelatoStruct>>;
export {};

import { BigNumberish, BytesLike } from "ethers";

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

export interface TypedDataDomain {
    /**
     *  The human-readable name of the signing domain.
     */
    name?: null | string;

    /**
     *  The major version of the signing domain.
     */
    version?: null | string;

    /**
     *  The chain ID of the signing domain.
     */
    chainId?: null | BigNumberish;

    /**
     *  The the address of the contract that will verify the signature.
     */
    verifyingContract?: null | string;

    /**
     *  A salt used for purposes decided by the specific domain.
     */
    salt?: null | BytesLike;
};

export interface TypedDataField {
    /**
     *  The field name.
     */
    name: string;

    /**
     *  The type of the field.
     */
    type: string;
};

export type Erc20PermitToSign = {
    types: Record<string, Array<TypedDataField>>;
    value: Record<string, any>;
    domain: TypedDataDomain;
};

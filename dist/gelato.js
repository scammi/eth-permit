"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGaslessTxToSign = exports.getGelatoRequestStruct = exports.EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA = exports.GELATO_RELAY_ADDRESS = exports.gelatoEIP712DomainTypeData = void 0;
const ethers_1 = require("ethers");
const gelato_abi_1 = __importDefault(require("./gelato-abi"));
const utils_1 = require("ethers/lib/utils");
function gelatoEIP712DomainTypeData(chain) {
    return {
        name: 'GelatoRelay1BalanceERC2771',
        version: '1',
        verifyingContract: exports.GELATO_RELAY_ADDRESS,
        chain,
    };
}
exports.gelatoEIP712DomainTypeData = gelatoEIP712DomainTypeData;
exports.GELATO_RELAY_ADDRESS = '0xd8253782c45a12053594b9deB72d8e8aB2Fca54c';
exports.EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA = {
    SponsoredCallERC2771: [
        { name: 'chainId', type: 'uint256' },
        { name: 'target', type: 'address' },
        { name: 'data', type: 'bytes' },
        { name: 'user', type: 'address' },
        { name: 'userNonce', type: 'uint256' },
        { name: 'userDeadline', type: 'uint256' },
    ],
};
function getGelatoRequestStruct(provider, chainId, target, metaTxToSign, deadline) {
    return __awaiter(this, void 0, void 0, function* () {
        const signerAddress = yield provider.getAddress();
        const relayerAddress = exports.GELATO_RELAY_ADDRESS;
        const gelatoRelayerContract = new ethers_1.Contract(relayerAddress, gelato_abi_1.default);
        const contract = gelatoRelayerContract.connect(provider);
        const userNonce = ethers_1.BigNumber.from(yield contract.userNonce(yield provider.getAddress()));
        let data;
        try {
            const iface = new utils_1.Interface([metaTxToSign.func]);
            data = iface.encodeFunctionData(metaTxToSign.functionName, metaTxToSign.parameters);
        }
        catch (e) {
            console.log(e);
            throw new Error('could not create data');
        }
        const gelatoRequestStruct = {
            chainId,
            target: target,
            data: data,
            user: signerAddress,
            userNonce: userNonce.toNumber(),
            userDeadline: deadline,
        };
        return gelatoRequestStruct;
    });
}
exports.getGelatoRequestStruct = getGelatoRequestStruct;
exports.getGaslessTxToSign = (chain, contractAddress, provider, metaTxToSign, deadline) => __awaiter(void 0, void 0, void 0, function* () {
    const domain = gelatoEIP712DomainTypeData(chain);
    const types = Object.assign({}, exports.EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA);
    const value = yield getGelatoRequestStruct(provider, chain, contractAddress, metaTxToSign, deadline);
    return { domain, types, value };
});

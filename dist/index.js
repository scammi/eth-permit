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
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPaymentTransaction = exports.getSignERC20Permit = exports.getERC2612PermitTypeData = exports.signERC2612Permit = exports.createTypedERC2612Data = void 0;
const rpc_1 = require("./rpc");
const lib_1 = require("./lib");
const gelato_1 = require("./gelato");
const gelato_2 = require("./gelato");
const ethers_1 = require("ethers");
const MAX_INT = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const EIP712Domain = [
    { name: "name", type: "string" },
    { name: "version", type: "string" },
    { name: "chainId", type: "uint256" },
    { name: "verifyingContract", type: "address" },
];
exports.createTypedERC2612Data = (message, domain) => {
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
const zeros = (numZeros) => ''.padEnd(numZeros, '0');
const getTokenName = (provider, address) => __awaiter(void 0, void 0, void 0, function* () { return lib_1.hexToUtf8((yield rpc_1.call(provider, address, NAME_FN)).substr(130)); });
const getDomain = (provider, token, version = '1') => __awaiter(void 0, void 0, void 0, function* () {
    if (typeof token !== 'string') {
        return token;
    }
    const tokenAddress = token;
    const [name, chainId] = yield Promise.all([
        getTokenName(provider, tokenAddress),
        rpc_1.getChainId(provider),
    ]);
    const domain = { name, version, chainId, verifyingContract: tokenAddress };
    return domain;
});
exports.signERC2612Permit = (provider, token, owner, spender, value = MAX_INT, deadline, nonce, version) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    const message = {
        owner,
        spender,
        value,
        nonce: nonce === undefined ? yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`) : nonce,
        deadline: deadline || MAX_INT,
    };
    const domain = yield getDomain(provider, token, version);
    const typedData = exports.createTypedERC2612Data(message, domain);
    const sig = yield rpc_1.signData(provider, owner, typedData);
    return Object.assign(Object.assign({}, sig), message);
});
exports.getERC2612PermitTypeData = (provider, token, owner, spender, value = MAX_INT, deadline, nonce, version) => __awaiter(void 0, void 0, void 0, function* () {
    const tokenAddress = token.verifyingContract || token;
    const message = {
        owner,
        spender,
        value,
        nonce: nonce === undefined ? yield rpc_1.call(provider, tokenAddress, `${NONCES_FN}${zeros(24)}${owner.substr(2)}`) : nonce,
        deadline: deadline || MAX_INT,
    };
    const domain = yield getDomain(provider, token, version);
    const typedData = exports.createTypedERC2612Data(message, domain);
    return typedData;
});
function getSignERC20Permit(buyerAddress, paymentIntentResponse, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const chain = paymentIntentResponse.chain;
        const contractAddress = paymentIntentResponse.contractAddress;
        const deadline = paymentIntentResponse.parameters['deadline'];
        const tokenAddress = paymentIntentResponse.parameters['paymentTokenAddress'];
        const amount = paymentIntentResponse.parameters['totalPrice'];
        if (!amount)
            throw new Error("No Amount set");
        const typeData = yield exports.getERC2612PermitTypeData(provider, tokenAddress, buyerAddress, contractAddress, Number(amount), Number(deadline));
        const permitType = { Permit: typeData.types.Permit };
        return { domain: typeData.domain, types: permitType, value: typeData.message };
    });
}
exports.getSignERC20Permit = getSignERC20Permit;
function buildPaymentTransaction(permitSignature, paymentIntentResponse, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const contractAddress = paymentIntentResponse.contractAddress;
        const functionName = paymentIntentResponse.functionName;
        const func = paymentIntentResponse.functionSignature;
        const chain = paymentIntentResponse.chain;
        const deadline = paymentIntentResponse.parameters.deadline;
        const splitPermitSignature = ethers_1.ethers.utils.splitSignature(permitSignature);
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
        ];
        const distributionParams = [];
        orderPropertiesToExtract.forEach(key => {
            // Check if the property exists in the object
            if (paymentIntentResponse.parameters.hasOwnProperty(key)) {
                // Retrieve the value and push it into the orderedParams array
                distributionParams.push(paymentIntentResponse.parameters[key]);
            }
        });
        const functionCall = { functionName, func, parameters: [...distributionParams, ...permitTransactionParams] };
        return getGaslessTxToSign(chain, contractAddress, provider, functionCall, deadline);
    });
}
exports.buildPaymentTransaction = buildPaymentTransaction;
const getGaslessTxToSign = (chain, contractAddress, provider, metaTxToSign, deadline) => __awaiter(void 0, void 0, void 0, function* () {
    const domain = gelato_1.gelatoEIP712DomainTypeData(chain);
    const types = Object.assign({}, gelato_2.EIP712_SPONSORED_CALL_ERC2771_TYPE_DATA);
    const value = yield gelato_1.getGelatoRequestStruct(provider, chain, contractAddress, metaTxToSign, deadline);
    return { domain, types, value };
});

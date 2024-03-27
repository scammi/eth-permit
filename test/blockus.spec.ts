import { TypedDataDomain, ethers } from 'ethers';
import { buildPaymentTransaction, getSignERC20Permit, signERC2612Permit } from '../src';
import { expect } from 'chai';
import { EIP712, IGelatoStruct } from '../src/types';

const spender = '0x0000000000000000000000000000000000000002';
const privateKey = '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff';
const intent = {
  chain: 137,
  parameters: {
      paymentTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      fromAddress: '0xAA9F814155B6c03f29B62D881D4Ac5b13eAc3399',
      totalPrice: BigInt('100'),
      transfers: [['0xAA9F814155B6c03f29B62D881D4Ac5b13eAc3399', BigInt('100')]],
      deadline: BigInt('100'),
  },
  contractAddress: '0xAA9F814155B6c03f29B62D881D4Ac5b13eAc3399',
  functionName: 'distributeTokensWithPermit',
  functionSignature: 'function distributeTokensWithPermit(address,address,(address,uint256)[],uint256,uint256,uint8,bytes32,bytes32)',
};


describe('Payment intention construction', () => {
    it('Builds payment meta transaction type data', async () => {
      const permitSig = '0xdd82062cb06d9d81fa0d71d7e5ebdf4f67506d9b270826dcd1ccc1dd83fe5aa17849d6bfeaba01f291d5bfbfba4b358f665b0914c512258edda41e47898793c21b'

      const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_RPC, 137);
      const wallet = new ethers.Wallet(privateKey, provider);

      const metaTxtoBeSign = await buildPaymentTransaction(
        permitSig,
        intent,
        wallet
      );

      expect(metaTxtoBeSign).to.haveOwnProperty('domain')
      expect(metaTxtoBeSign).to.haveOwnProperty('types')
      expect(metaTxtoBeSign).to.haveOwnProperty('value')
    });

    it('Creates permit type data', async() => {
      const provider = new ethers.providers.JsonRpcProvider(process.env.ALCHEMY_RPC, 137);
      const wallet = new ethers.Wallet(privateKey, provider);
      const buyersAddress = await wallet.getAddress();

      const permitTypeData = await getSignERC20Permit(
        buyersAddress,
        intent,
        wallet
      );
      expect(permitTypeData).to.haveOwnProperty('domain')
      expect(permitTypeData).to.haveOwnProperty('types')
      expect(permitTypeData).to.haveOwnProperty('value')
    });

    it('Complete flow example', async() => {
      const provider = new ethers.providers.JsonRpcProvider('https://polygon-mumbai.g.alchemy.com/v2/9tHtWGoVgCRyxFyjItzHpN2DDzEKH8xT', 137);
      const wallet = new ethers.Wallet(privateKey, provider);
      const buyersAddress = await wallet.getAddress();

      // 1. GETS PAYMENT INTENTION

      // 2. Creates permit type data
      const permitTypeData = await getSignERC20Permit(
        buyersAddress,
        intent,
        wallet
      );

      // 3. Get permit signature 
      const permitSignature = await wallet._signTypedData(
        permitTypeData.domain as TypedDataDomain,
        permitTypeData.types,
        permitTypeData.value,
      );      


      // Constructs payment transaction
      const paymentMetaTransaction:EIP712<IGelatoStruct> = await buildPaymentTransaction(
        buyersAddress,
        permitSignature,
        intent
      );
    
      // Sign meta transaction for token distribution.
      const distributeTokenSignature = await wallet._signTypedData(
          paymentMetaTransaction.domain as TypedDataDomain,
          paymentMetaTransaction.types,
          paymentMetaTransaction.value,
      );

      const metaTxDeadline = paymentMetaTransaction.value.userDeadline;
      console.log({ distributeTokenSignature, permitSignature, metaTxDeadline });

    });
});


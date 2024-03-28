import { ethers } from 'ethers';
import { MAX_INT, buildPaymentTransaction, getSignERC20Permit } from '../src';
import { expect } from 'chai';
import { EIP712, IGelatoStruct } from '../src/types';
import 'dotenv/config'

const privateKey = process.env.PK ?? '';
const intent = {
  chain: 137,
  parameters: {
      paymentTokenAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      fromAddress: '0x61406EdAa39799EECe2D6567498E0D9C61fef1B6',
      totalPrice: 10000n,
      transfers: [['0xCa75873f10F3B7e7eFB0383fdda0c9644ad8f608', 10000n]],
      deadline: 115792089237316195423570985008687907853269984665640564039457584007913129639935n,
  },
  contractAddress: '0xA65cc7AF14003464A87294E92FaCD304A61059ac',
  functionName: 'distributeTokensWithPermit',
  functionSignature: 'function distributeTokensWithPermit(address,address,(address,uint256)[],uint256,uint256,uint8,bytes32,bytes32)',
};


describe('Payment intention construction', () => {
    it('Builds payment meta transaction type data', async () => {
      const permitSig = '0xdd82062cb06d9d81fa0d71d7e5ebdf4f67506d9b270826dcd1ccc1dd83fe5aa17849d6bfeaba01f291d5bfbfba4b358f665b0914c512258edda41e47898793c21b'

      const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC, 137);
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
      const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC, 137);
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
      const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_RPC, 137);
      const wallet = new ethers.Wallet(privateKey, provider);
      const buyersAddress = await wallet.getAddress();

      // WIP Still works need to be done to acomodate ethers v6 providers.

      // 1. GETS PAYMENT INTENTION

      // 2. Creates permit type data
      const permitTypeData = await getSignERC20Permit(
        buyersAddress,
        intent,
        wallet
      );

      console.log(permitTypeData);

      // 3. Get permit signature 
      const permitSignature = await wallet.signTypedData(
        permitTypeData.domain,
        permitTypeData.types,
        permitTypeData.value,
      );      

      // Constructs payment transaction
      const paymentMetaTransaction:EIP712<IGelatoStruct> = await buildPaymentTransaction(
        permitSignature,
        intent,
        wallet
      );

      console.log(paymentMetaTransaction)
      
      // Sign meta transaction for token distribution.
      const distributeTokenSignature = await wallet.signTypedData(
        paymentMetaTransaction.domain,
        paymentMetaTransaction.types,
        paymentMetaTransaction.value,
      );

      const metaTxDeadline = paymentMetaTransaction.value.userDeadline;
      console.log({ distributeTokenSignature, permitSignature, metaTxDeadline });
    });
});


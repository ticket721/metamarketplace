const { expect_map } = require('./utils');
const ethers = require('ethers');
const { DaiPlusOfferSigner } = require('./DaiPlusOfferSigner');
const { DaiPlusSigner } = require('./DaiPlusSigner');
const { CHAIN_ID, SCOPE_INDEX, CONTRACT_NAME } = require('./constants');

module.exports = {
    daiplusoffer_allowance_too_low: async function daiplusoffer_allowance_too_low() {

        const { accounts, expect } = this;

        const MetaMarketplace = this.contracts[CONTRACT_NAME];
        const { ERC20, ERC2280, ERC721 } = this.contracts;
        await MetaMarketplace.initialize_v0(CHAIN_ID, this.contracts.ERC20.address, this.contracts.ERC2280.address, this.contracts.ERC721.address);

        const TicketOwnerWallet = ethers.Wallet.createRandom();
        const TicketBuyerWallet = ethers.Wallet.createRandom();

        const TicketOwner = TicketOwnerWallet.address;
        const TicketBuyer = TicketBuyerWallet.address;
        const AuctionRelayer = accounts[2];

        await web3.eth.sendTransaction({ from: accounts[0], to: TicketBuyer, value: web3.utils.toWei('1', 'ether') });

        const BuyPrice = 100;
        const Reward = 100;

        await expect_map(ERC20, ERC2280, ERC721, [TicketOwner, TicketBuyer, AuctionRelayer],
            [0, 0, 0], // Dai
            [0, 0, 0], // Dai+
            [0, 0, 0],  // T721
            expect
        );

        // 1. Create the Ticket
        await ERC721.mint(TicketOwner, SCOPE_INDEX);

        // 2. Create the payment + approve marketplace
        await ERC2280.mint(TicketBuyer, BuyPrice + Reward);

        await expect_map(ERC20, ERC2280, ERC721, [TicketOwner, TicketBuyer, AuctionRelayer],
            [0, 0, 0], // Dai
            [0, BuyPrice + Reward, 0], // Dai+
            [1, 0, 0], // T721
            expect
        );

        const nonce = (await MetaMarketplace.getNonce(1));

        const DaiPlusOffer = {
            auction: {
                seller: TicketOwner,
                buyer: TicketBuyer,
                relayer: AuctionRelayer,
                ticket: 1,
                nonce: nonce.toNumber()
            },
            amount: BuyPrice,
            reward: Reward
        };

        const signer = new DaiPlusOfferSigner('MetaMarketplace', '0', MetaMarketplace.address, CHAIN_ID);
        const payload = signer.generatePayload(DaiPlusOffer, 'DaiPlusOffer');
        const seller_signature = await signer.sign(TicketOwnerWallet.privateKey, payload);
        const buyer_signature = await signer.sign(TicketBuyerWallet.privateKey, payload);

        const DaiPlusApprove = {
            spender: MetaMarketplace.address,
            amount: BuyPrice + Reward - 1,
            actors: {
                signer: TicketBuyer,
                relayer: MetaMarketplace.address
            },
            txparams: {
                nonce: 0,
                gasLimit: 1000000,
                gasPrice: 1000000,
                reward: 0
            }
        }

        const dpsigner = new DaiPlusSigner('ERC2280Mock', '1', CHAIN_ID, ERC2280.address)

        const dpapprove_signature = await dpsigner.approve(DaiPlusApprove.spender, DaiPlusApprove.amount, DaiPlusApprove.actors, DaiPlusApprove.txparams, TicketBuyerWallet.privateKey);

        await expect(MetaMarketplace.checkDaiPlusOffer(
            [TicketOwner, TicketBuyer, AuctionRelayer],
            [DaiPlusOffer.auction.ticket, DaiPlusOffer.auction.nonce, DaiPlusOffer.amount, DaiPlusOffer.reward],
            [DaiPlusApprove.txparams.nonce, DaiPlusApprove.txparams.gasLimit, DaiPlusApprove.txparams.gasPrice],
            `${seller_signature.hex}${buyer_signature.hex.slice(2)}${dpapprove_signature.hex.slice(2)}`,
            {
                from: AuctionRelayer,
                gasPrice: DaiPlusApprove.txparams.gasPrice,
                gasLimit: Math.floor(DaiPlusApprove.txparams.gasLimit * 1.1)
            }
        )).to.eventually.be.rejectedWith('DaiPlus::verifyApprove | invalid signer');

        return expect(MetaMarketplace.sealDaiPlusOffer(
            [TicketOwner, TicketBuyer, AuctionRelayer],
            [DaiPlusOffer.auction.ticket, DaiPlusOffer.auction.nonce, DaiPlusOffer.amount, DaiPlusOffer.reward],
            [DaiPlusApprove.txparams.nonce, DaiPlusApprove.txparams.gasLimit, DaiPlusApprove.txparams.gasPrice],
            `${seller_signature.hex}${buyer_signature.hex.slice(2)}${dpapprove_signature.hex.slice(2)}`,
            {
                from: AuctionRelayer,
                gasPrice: DaiPlusApprove.txparams.gasPrice,
                gasLimit: Math.floor(DaiPlusApprove.txparams.gasLimit * 1.1)
            }
        )).to.eventually.be.rejectedWith('DaiPlus::_signedApprove | invalid signer');

    }
}

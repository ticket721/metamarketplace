const { expect_map, getEthersERC20Contract } = require('./utils');
const ethers = require('ethers');
const { DaiOfferSigner } = require('./DaiOfferSigner');
const { CHAIN_ID, SCOPE_INDEX, CONTRACT_NAME } = require('./constants');

module.exports = {
    daioffer_allowance_too_low: async function daioffer_allowance_too_low() {

        const { accounts, expect } = this;

        const MetaMarketplace = this.contracts[CONTRACT_NAME];
        const { ERC20, ERC2280, ERC721 } = this.contracts;
        await MetaMarketplace.initialize_v0(CHAIN_ID, this.contracts.ERC20.address, this.contracts.ERC2280.address, this.contracts.ERC721.address);

        const TicketOwnerWallet = ethers.Wallet.createRandom();
        const TicketBuyerWallet = ethers.Wallet.createRandom();

        const EthersERC20Instance = await getEthersERC20Contract(artifacts.require('ERC20Mock'), ERC20, TicketBuyerWallet);

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
        await ERC20.mint(TicketBuyer, BuyPrice + Reward);
        await EthersERC20Instance.functions.approve(MetaMarketplace.address, (BuyPrice + Reward) - 1);
        expect((await ERC20.allowance(TicketBuyer, MetaMarketplace.address)).toNumber()).to.equal(BuyPrice + Reward - 1);

        await expect_map(ERC20, ERC2280, ERC721, [TicketOwner, TicketBuyer, AuctionRelayer],
            [0, BuyPrice + Reward, 0], // Dai
            [0, 0, 0], // Dai+
            [1, 0, 0], // T721
            expect
        );

        const DaiOffer = {
            auction: {
                seller: TicketOwner,
                buyer: TicketBuyer,
                relayer: AuctionRelayer,
                ticket: 1,
                nonce: 0
            },
            amount: BuyPrice,
            reward: Reward
        };

        const signer = new DaiOfferSigner('MetaMarketplace', '0', MetaMarketplace.address, CHAIN_ID);
        const payload = signer.generatePayload(DaiOffer, 'DaiOffer');
        const seller_signature = await signer.sign(TicketOwnerWallet.privateKey, payload);
        const buyer_signature = await signer.sign(TicketBuyerWallet.privateKey, payload);

        return expect(MetaMarketplace.checkDaiOffer(
            [TicketOwner, TicketBuyer, AuctionRelayer],
            [DaiOffer.auction.ticket, DaiOffer.auction.nonce, DaiOffer.amount, DaiOffer.reward],
            `${seller_signature.hex}${buyer_signature.hex.slice(2)}`,
            {
                from: AuctionRelayer
            }
        )).to.eventually.be.rejectedWith('MMv0::checkDaiOffer | buyer dai allowance too low');


    }
}

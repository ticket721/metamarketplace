const { getCurrencies, getArguments } = require('./utils');
const ethers = require('ethers');
const { MarketplaceOfferSigner } = require('./MarketplaceOfferSigner');
const { SCOPE_INDEX, CONTRACT_NAME} = require('./constants');

module.exports = {
    erc20_offer_smart_wallets: async function erc20_offer_smart_wallets() {

        const {expect, network_id} = this;

        const MetaMarketplace = this.contracts[CONTRACT_NAME];
        const { ERC20, Dai, ERC721, SmartWalletMockArtifact } = this.contracts;

        const TicketOwnerControllerWallet = ethers.Wallet.createRandom();
        const TicketBuyerControllerWallet = ethers.Wallet.createRandom();

        const TicketOwnerSmartWallet = await SmartWalletMockArtifact.new(TicketOwnerControllerWallet.address);
        const TicketBuyerSmartWallet = await SmartWalletMockArtifact.new(TicketBuyerControllerWallet.address);

        const TicketOwner = TicketOwnerSmartWallet.address;
        const TicketBuyer = TicketBuyerSmartWallet.address;

        const BuyPrice = 100;

        // 1. Create the Ticket
        await ERC721.mint(TicketOwner, SCOPE_INDEX);
        const Ticket = 1;
        await ERC20.mint(TicketBuyer, BuyPrice);
        await Dai.mint(TicketBuyer, BuyPrice);
        await TicketBuyerSmartWallet.approve(ERC20.address, MetaMarketplace.address, BuyPrice);
        await TicketBuyerSmartWallet.approve(Dai.address, MetaMarketplace.address, BuyPrice);

        const signer = new MarketplaceOfferSigner('MetaMarketplace', '0', MetaMarketplace.address, network_id);

        const offer = {
            payments: [
                {
                    mode: 1,
                    address: ERC20.address,
                    price: BuyPrice
                },
                {
                    mode: 1,
                    address: Dai.address,
                    price: BuyPrice
                }
            ],
            buyer: TicketBuyer,
            buyer_mode: 2,
            seller: TicketOwner,
            seller_mode: 2,
            ticket: Ticket,
            nonce: 0
        };

        const [currencies, prices] = getCurrencies(offer);

        const payload = signer.generatePayload({
            seller: offer.seller,
            buyer: offer.buyer,
            ticket: offer.ticket,
            nonce: offer.nonce,
            currencies: currencies,
            prices: prices
        }, 'MarketplaceOffer');

        offer.buyer_signature = (await signer.sign(TicketBuyerControllerWallet.privateKey, payload)).hex;
        offer.seller_signature = (await signer.sign(TicketOwnerControllerWallet.privateKey, payload)).hex;

        const [addr, nums, bdata] = getArguments(offer);

        expect((await ERC20.balanceOf(TicketBuyer)).toNumber()).to.equal(BuyPrice);
        expect((await Dai.balanceOf(TicketBuyer)).toNumber()).to.equal(BuyPrice);
        expect((await ERC20.balanceOf(TicketOwner)).toNumber()).to.equal(0);
        expect((await Dai.balanceOf(TicketOwner)).toNumber()).to.equal(0);
        expect((await ERC721.ownerOf(Ticket)).toLowerCase()).to.equal(TicketOwner.toLowerCase());

        await MetaMarketplace.verifySeal(addr, nums, bdata);
        await MetaMarketplace.seal(addr, nums, bdata);

        expect((await ERC20.balanceOf(TicketBuyer)).toNumber()).to.equal(0);
        expect((await Dai.balanceOf(TicketBuyer)).toNumber()).to.equal(0);
        expect((await ERC20.balanceOf(TicketOwner)).toNumber()).to.equal(BuyPrice);
        expect((await Dai.balanceOf(TicketOwner)).toNumber()).to.equal(BuyPrice);
        expect((await ERC721.ownerOf(Ticket)).toLowerCase()).to.equal(TicketBuyer.toLowerCase());

    }
}

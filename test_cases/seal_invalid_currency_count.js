const { expect_map, getEthersERC20Contract, encodeU256, getCurrencies, getArguments } = require('./utils');
const ethers = require('ethers');
const { MarketplaceOfferSigner } = require('./MarketplaceOfferSigner');
const {CHAIN_ID, SCOPE_INDEX, CONTRACT_NAME} = require('./constants');

module.exports = {
    seal_invalid_currency_count: async function seal_invalid_currency_count() {

        const {accounts, expect, network_id} = this;

        const MetaMarketplace = this.contracts[CONTRACT_NAME];
        const { ERC20, ERC2280, ERC721 } = this.contracts;

        const TicketOwnerWallet = ethers.Wallet.createRandom();
        const TicketBuyerWallet = ethers.Wallet.createRandom();

        const EthersERC20Instance = await getEthersERC20Contract(artifacts.require('ERC20Mock_v0'), ERC20, TicketBuyerWallet);
        const EthersERC2280Instance = await getEthersERC20Contract(artifacts.require('ERC2280Mock_v0'), ERC2280, TicketBuyerWallet);

        const TicketOwner = TicketOwnerWallet.address;
        const TicketBuyer = TicketBuyerWallet.address;
        const AuctionRelayer = accounts[2];

        await web3.eth.sendTransaction({ from: accounts[0], to: TicketBuyer, value: web3.utils.toWei('1', 'ether') });

        const BuyPrice = 100;

        // 1. Create the Ticket
        await ERC721.mint(TicketOwner, SCOPE_INDEX);
        const Ticket = 1;
        await ERC20.mint(TicketBuyer, BuyPrice);
        await ERC2280.mint(TicketBuyer, BuyPrice);
        await EthersERC20Instance.functions.approve(MetaMarketplace.address, BuyPrice);
        await EthersERC2280Instance.functions.approve(MetaMarketplace.address, BuyPrice);

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
                    address: ERC2280.address,
                    price: BuyPrice
                }
            ],
            buyer: TicketBuyer,
            buyer_mode: 1,
            seller: TicketOwner,
            seller_mode: 1,
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

        offer.buyer_signature = (await signer.sign(TicketBuyerWallet.privateKey, payload)).hex;
        offer.seller_signature = (await signer.sign(TicketOwnerWallet.privateKey, payload)).hex;

        const [addr, nums, bdata] = getArguments(offer);
        nums[4] = 0;

        await expect(MetaMarketplace.verifySeal(addr, nums, bdata)).to.eventually.be.rejectedWith('MMv0::verifySeal | invalid empty currency count');
        return expect(MetaMarketplace.seal(addr, nums, bdata)).to.eventually.be.rejectedWith('MMv0::seal | invalid empty currency count');

    }
}

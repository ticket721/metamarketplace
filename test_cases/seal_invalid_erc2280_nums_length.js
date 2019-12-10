const { expect_map, getEthersERC20Contract, encodeU256, getCurrencies, getArguments } = require('./utils');
const ethers = require('ethers');
const { MarketplaceOfferSigner } = require('./MarketplaceOfferSigner');
const {CHAIN_ID, SCOPE_INDEX, CONTRACT_NAME} = require('./constants');
const {ERC2280Signer} = require('@ticket721/e712');

module.exports = {
    seal_invalid_erc2280_nums_length: async function seal_invalid_erc2280_nums_length() {

        const {accounts, expect, network_id} = this;

        const MetaMarketplace = this.contracts[CONTRACT_NAME];
        const { ERC20, ERC2280, ERC721 } = this.contracts;

        const TicketOwnerWallet = ethers.Wallet.createRandom();
        const TicketBuyerWallet = ethers.Wallet.createRandom();

        const TicketOwner = TicketOwnerWallet.address;
        const TicketBuyer = TicketBuyerWallet.address;
        const AuctionRelayer = accounts[2];

        await web3.eth.sendTransaction({ from: accounts[0], to: TicketBuyer, value: web3.utils.toWei('1', 'ether') });

        const BuyPrice = 100;

        // 1. Create the Ticket
        await ERC721.mint(TicketOwner, SCOPE_INDEX);
        const Ticket = 1;
        await ERC2280.mint(TicketBuyer, BuyPrice);

        const signer = new MarketplaceOfferSigner('MetaMarketplace', '0', MetaMarketplace.address, network_id);
        const erc2280signer = new ERC2280Signer('ERC2280Mock', '1', 1, ERC2280.address);
        const transfer_sig = await erc2280signer.transfer(TicketOwner, BuyPrice, {
            signer: TicketBuyer,
            relayer: MetaMarketplace.address
        }, {
            nonce: 0,
            gasLimit: 0,
            gasPrice: 0,
            reward: 0
        }, TicketBuyerWallet.privateKey);

        const offer = {
            payments: [
                {
                    mode: 2,
                    address: ERC2280.address,
                    price: BuyPrice,
                    sig: transfer_sig.hex
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
        const err_nums = nums.slice(0, 6);

        await expect(MetaMarketplace.verifySeal(addr, err_nums, bdata)).to.eventually.be.rejectedWith('MMv0::verifyERC2280Payment | invalid nums argument length');
        return expect(MetaMarketplace.seal(addr, err_nums, bdata)).to.eventually.be.rejectedWith('MMv0::processERC2280Payment | invalid nums argument length');
    }
}

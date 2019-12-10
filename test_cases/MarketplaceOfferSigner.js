const {EIP712Signer} = require('@ticket721/e712');

const MarketplaceOffer = [
    {
        name: 'buyer',
        type: 'address'
    },
    {
        name: 'seller',
        type: 'address'
    },
    {
        name: 'ticket',
        type: 'uint256'
    },
    {
        name: 'nonce',
        type: 'uint256'
    },
    {
        name: 'currencies',
        type: 'bytes'
    },
    {
        name: 'prices',
        type: 'bytes'
    },
];

class MarketplaceOfferSigner extends EIP712Signer {
    constructor(name, version, verifyingContract, chainId) {
        super(
            {
                name,
                version,
                verifyingContract,
                chainId
            },
            ['MarketplaceOffer', MarketplaceOffer],
        )
    }
}

module.exports = {
    MarketplaceOfferSigner
};

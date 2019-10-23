const {EIP712Signer} = require('@ticket721/e712');

const Auction = [
    {
        name: 'seller',
        type: 'address'
    },
    {
        name: 'buyer',
        type: 'address'
    },
    {
        name: 'relayer',
        type: 'address'
    },
    {
        name: 'ticket',
        type: 'uint256'
    },
    {
        name: 'nonce',
        type: 'uint256'
    }
];

const DaiOffer = [
    {
        name: 'auction',
        type: 'Auction'
    },
    {
        name: 'amount',
        type: 'uint256'
    },
    {
        name: 'reward',
        type: 'uint256'
    }
];

class DaiOfferSigner extends EIP712Signer {
    constructor(name, version, verifyingContract, chainId) {
        super(
            {
                name,
                version,
                verifyingContract,
                chainId
            },
            ['Auction', Auction],
            ['DaiOffer', DaiOffer]
        )
    }
}

module.exports = {
    DaiOfferSigner
};

const { ERC2280Signer } = require('@ticket721/e712');

class DaiPlusSigner extends ERC2280Signer {
    constructor(name, version, verifyingContract, chainId) {
        super(
            name,
            version,
            verifyingContract,
            chainId
        )
    }
}

module.exports = {
    DaiPlusSigner
};

pragma solidity 0.5.15;

contract MetaMarketplaceDomain_v0 {

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function _splitSignature(bytes memory signature) private pure returns (Signature memory sig) {
        require(signature.length == 65, "Invalid signature length");

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := and(mload(add(signature, 65)), 255)
        }

        if (v < 27) {
            v += 27;
        }

        require(v == 27 || v == 28, "Invalid v argument");
        return Signature({
            v: v,
            r: r,
            s: s
            });
    }

    struct EIP712Domain {
        string  name;
        string  version;
        uint256 chainId;
        address verifyingContract;
    }

    bytes32 constant EIP712DOMAIN_TYPEHASH = keccak256(
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
    );

    function hash(EIP712Domain memory eip712Domain) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                EIP712DOMAIN_TYPEHASH,
                keccak256(bytes(eip712Domain.name)),
                keccak256(bytes(eip712Domain.version)),
                eip712Domain.chainId,
                eip712Domain.verifyingContract
            ));
    }

    bytes32 DOMAIN_SEPARATOR;

    struct MarketplaceOffer {
        address buyer;
        address seller;
        uint256 ticket;
        uint256 nonce;
        bytes currencies;
        bytes prices;
    }

    bytes32 constant MARKETPLACEOFFER_TYPEHASH = keccak256(
    // solhint-disable-next-line max-line-length
        "MarketplaceOffer(address buyer,address seller,uint256 ticket,uint256 nonce,bytes currencies,bytes prices)"
    );

    function hash(MarketplaceOffer memory mpo) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                MARKETPLACEOFFER_TYPEHASH,
                mpo.buyer,
                mpo.seller,
                mpo.ticket,
                mpo.nonce,
                keccak256(mpo.currencies),
                keccak256(mpo.prices)
            ));
    }

    function verify(MarketplaceOffer memory mpo, bytes memory raw_signature) internal view returns (address) {
        Signature memory signature = _splitSignature(raw_signature);
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(mpo)
            ));
        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    constructor(string memory _domain_name, string memory _version, uint256 _chainId) internal {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: _domain_name,
            version: _version,
            chainId: _chainId,
            verifyingContract: address(this)
            }));
    }


}

pragma solidity >=0.4.25 <0.6.0;

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

    struct Auction {
        address seller;
        address buyer;
        address relayer;
        uint256 ticket;
        uint256 nonce;
    }

    bytes32 constant AUCTION_TYPEHASH = keccak256(
        "Auction(address seller,address buyer,address relayer,uint256 ticket,uint256 nonce)"
    );

    function hash(Auction memory auction) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                AUCTION_TYPEHASH,
                auction.seller,
                auction.buyer,
                auction.relayer,
                auction.ticket,
                auction.nonce
            ));
    }

    struct DaiOffer {
        Auction auction;
        uint256 amount;
        uint256 reward;
    }

    bytes32 constant DAIOFFER_TYPEHASH = keccak256(
        // solhint-disable-next-line max-line-length
        "DaiOffer(Auction auction,uint256 amount,uint256 reward)Auction(address seller,address buyer,address relayer,uint256 ticket,uint256 nonce)"
    );

    function hash(DaiOffer memory daioffer) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                DAIOFFER_TYPEHASH,
                hash(daioffer.auction),
                daioffer.amount,
                daioffer.reward
            ));
    }

    function verify(DaiOffer memory daioffer, bytes memory raw_signature) internal view returns (address) {
        Signature memory signature = _splitSignature(raw_signature);
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(daioffer)
            ));
        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    struct DaiPlusOffer {
        Auction auction;
        uint256 amount;
        uint256 reward;
    }

    bytes32 constant DAIPLUSOFFER_TYPEHASH = keccak256(
        // solhint-disable-next-line max-line-length
        "DaiPlusOffer(Auction auction,uint256 amount,uint256 reward)Auction(address seller,address buyer,address relayer,uint256 ticket,uint256 nonce)"
    );

    function hash(DaiPlusOffer memory daiplusoffer) internal pure returns (bytes32) {
        return keccak256(abi.encode(
                DAIPLUSOFFER_TYPEHASH,
                hash(daiplusoffer.auction),
                daiplusoffer.amount,
                daiplusoffer.reward
            ));
    }

    function verify(DaiPlusOffer memory daiplusoffer, bytes memory raw_signature) internal view returns (address) {
        Signature memory signature = _splitSignature(raw_signature);
        bytes32 digest = keccak256(abi.encodePacked(
                "\x19\x01",
                DOMAIN_SEPARATOR,
                hash(daiplusoffer)
            ));
        return ecrecover(digest, signature.v, signature.r, signature.s);
    }

    function initialize_v0(string memory _domain_name, string memory _version, uint256 _chainId) internal {
        DOMAIN_SEPARATOR = hash(EIP712Domain({
            name: _domain_name,
            version: _version,
            chainId: _chainId,
            verifyingContract: address(this)
            }));
    }


}

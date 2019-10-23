pragma solidity >=0.4.25 <0.6.0;

import "@openzeppelin/upgrades/contracts/Initializable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "erc2280/contracts/IERC2280.sol";
import "./MetaMarketplaceDomain_v0.sol";
import "./BytesUtil_v0.sol";

contract MetaMarketplace_v0 is Initializable, MetaMarketplaceDomain_v0 {

    event SealedAuction(
        address indexed buyer,
        address indexed seller,
        uint256 indexed ticket,
        address currency,
        uint256 amount
    );

    IERC20 public dai;
    IERC2280 public daiplus;
    IERC721 public t721;

    mapping (uint256 => uint256) ticket_nonces;

    function initialize_v0(uint256 _chainId, address _dai, address _daiplus, address _t721) initializer public {
        MetaMarketplaceDomain_v0.initialize_v0("MetaMarketplace", "0", _chainId);
        dai = IERC20(_dai);
        daiplus = IERC2280(_daiplus);
        t721 = IERC721(_t721);
    }

    modifier ticketNonceCheck(uint256 ticket, uint256 nonce) {
        require(ticket_nonces[ticket] == nonce, "MMv0::ticketNonceCheck | invalid nonce for ticket offer");
        ticket_nonces[ticket] += 1;
        _;
    }

    modifier relayerCheck(address relayer) {
        require(relayer == msg.sender || relayer == address(0), "MMv0::relayerCheck | invalid relayer");
        _;
    }

    // @notice Recover the current ticket nonce
    //
    // @param ticket Get the nonce of provided ticket ID
    //
    function getNonce(uint256 ticket) external view returns (uint256 nonce) {
        return ticket_nonces[ticket];
    }

    // @notice Verifies a Dai deal before submitting it.
    //
    // @dev The function MUST throw if nonce is invalid
    //
    // @dev The function MUST throw if signatures are invalid
    //
    // @dev The function MUST throw if buyer hasn't alowed enough Dai to cover payment + reward
    //
    // @dev `seller` is the initial ticket owner (actors[0])
    // @dev `buyer` is the actor purchasing the ticket (actors[1])
    // @dev `ticket` is the id of the sold ticket (offer_arguments[0])
    // @dev `nonce` is the transaction id of the sale (offer_arguments[1])
    // @dev `amount` is the price paid by the buyer to the seller (offer_arguments[2])
    // @dev `reward` is the prive paid by the buyer to the transaction relayer (offer_arguments[3])
    //
    // @param actors Array of `address`es that contains `seller` as `actors[0]` and `buyer` as `actors[1]`.
    //
    // @param offer_arguments Array of `uint256` that contains `ticket` as `offer_arguments[0]`,
    //                        `nonce` as `offer_arguments[1]`, `amount` as `offer_arguments[2]`, and `reward` as
    //                        `offer_arguments[3]`.
    //
    function checkDaiOffer(
        address[3] calldata actors,
        uint256[4] calldata offer_arguments,
        bytes calldata signatures
    ) external view {
        // 1. Verify Relayer
        require(actors[2] == msg.sender || actors[2] == address(0), "MMv0::checkDaiOffer | invalid relayer");

        // 2. Verify Nonce
        require(ticket_nonces[offer_arguments[0]] == offer_arguments[1],
            "MMv0::checkDaiOffer | invalid nonce for ticket offer");

        // 3. Check signature length
        require(signatures.length == 65 * 2, "MMv0::checkDaiOffer | signatures should be 130 bytes long");

        // 4. Check signatures validity
        bytes memory seller_signature = BytesUtil_v0.slice(signatures, 0, 65);
        bytes memory buyer_signature = BytesUtil_v0.slice(signatures, 65, 65);

        DaiOffer memory daioffer = DaiOffer({
            auction: Auction({
                seller: actors[0],
                buyer: actors[1],
                relayer: actors[2],
                ticket: offer_arguments[0],
                nonce: offer_arguments[1]
                }),
            amount: offer_arguments[2],
            reward: offer_arguments[3]
            });

        address seller_verification = verify(daioffer, seller_signature);
        address buyer_verification = verify(daioffer, buyer_signature);

        require(seller_verification == actors[0], "MMv0::checkDaiOffer | failed seller signature check");
        require(buyer_verification == actors[1], "MMv0::checkDaiOffer | failed buyer signature check");

        // 5. Check payer dai allowance
        require(dai.allowance(daioffer.auction.buyer, address(this)) >= daioffer.amount + daioffer.reward,
            "MMv0::checkDaiOffer | buyer dai allowance too low");

        // 6. Check ERC721 ownership of the ticket
        require(t721.ownerOf(daioffer.auction.ticket) == daioffer.auction.seller,
            "MMv0::checkDaiOffer | seller is not ticket owner");
    }

    // @notice Seals an exchange of a ticket for DAI. Two signatures (seller & buyer) are required
    //         to trigger the exchange mechanism.
    //
    // @dev The function MUST throw if nonce is invalid
    //
    // @dev The function MUST throw if signatures are invalid
    //
    // @dev The function MUST throw if buyer hasn't alowed enough Dai to cover payment + reward
    //
    // @dev `seller` is the initial ticket owner (actors[0])
    // @dev `buyer` is the actor purchasing the ticket (actors[1])
    // @dev `ticket` is the id of the sold ticket (offer_arguments[0])
    // @dev `nonce` is the transaction id of the sale (offer_arguments[1])
    // @dev `amount` is the price paid by the buyer to the seller (offer_arguments[2])
    // @dev `reward` is the prive paid by the buyer to the transaction relayer (offer_arguments[3])
    //
    // @param actors Array of `address`es that contains `seller` as `actors[0]` and `buyer` as `actors[1]`.
    //
    // @param offer_arguments Array of `uint256` that contains `ticket` as `offer_arguments[0]`,
    //                        `nonce` as `offer_arguments[1]`, `amount` as `offer_arguments[2]`, and `reward` as
    //                        `offer_arguments[3]`.
    //
    function sealDaiOffer(
        address[3] calldata actors,
        uint256[4] calldata offer_arguments,
        bytes calldata signatures
    ) external relayerCheck(actors[2]) ticketNonceCheck(offer_arguments[0], offer_arguments[1]) {

        require(signatures.length == 65 * 2, "MMv0::sealDaiOffer | signatures should be 130 bytes long");

        bytes memory seller_signature = BytesUtil_v0.slice(signatures, 0, 65);
        bytes memory buyer_signature = BytesUtil_v0.slice(signatures, 65, 65);

        DaiOffer memory daioffer = DaiOffer({
            auction: Auction({
                seller: actors[0],
                buyer: actors[1],
                relayer: actors[2],
                ticket: offer_arguments[0],
                nonce: offer_arguments[1]
                }),
            amount: offer_arguments[2],
            reward: offer_arguments[3]
            });

        address seller_verification = verify(daioffer, seller_signature);
        address buyer_verification = verify(daioffer, buyer_signature);

        require(seller_verification == actors[0], "MMv0::sealDaiOffer | failed seller signature check");
        require(buyer_verification == actors[1], "MMv0::sealDaiOffer | failed buyer signature check");

        // 1. Recover Dai before dai+ wrapping
        dai.transferFrom(daioffer.auction.buyer, address(this), daioffer.amount + daioffer.reward);
        dai.approve(address(daiplus), daioffer.amount + daioffer.reward);

        // 2. Paying Seller. Takes Dai and converts it into Dai+ for seller.
        daiplus.transferFrom(address(daiplus), daioffer.auction.seller, daioffer.amount);

        // 3. Transfering Ticket
        t721.transferFrom(daioffer.auction.seller, daioffer.auction.buyer, daioffer.auction.ticket);

        // 4. Paying Reward
        if (daioffer.reward > 0) {
            daiplus.transferFrom(address(daiplus), msg.sender, daioffer.reward);
        }

        emit SealedAuction(
            daioffer.auction.buyer,
            daioffer.auction.seller,
            daioffer.auction.ticket,
            address(daiplus),
            daioffer.amount
        );
    }

    // @notice Verifies a Dai+ deal before submitting it.
    //
    // @dev The function MUST throw if nonce is invalid
    //
    // @dev The function MUST throw if signatures are invalid
    //
    // @dev The function MUST throw if buyer hasn't alowed enough Dai to cover payment + reward
    //
    // @dev `seller` is the initial ticket owner (actors[0])
    // @dev `buyer` is the actor purchasing the ticket (actors[1])
    // @dev `ticket` is the id of the sold ticket (offer_arguments[0])
    // @dev `nonce` is the transaction id of the sale (offer_arguments[1])
    // @dev `amount` is the price paid by the buyer to the seller (offer_arguments[2])
    // @dev `reward` is the prive paid by the buyer to the transaction relayer (offer_arguments[3])
    // @dev `nonce` used for the dai+ approval (payment_arguments[0])
    // @dev `nonce` used for the dai+ approval (payment_arguments[0])
    // @dev `gasLimit` used for the dai+ approval (payment_arguments[1])
    // @dev `gasPrice` used for the dai+ approval (payment_arguments[2])
    //
    // @param actors Array of `address`es that contains `seller` as `actors[0]` and `buyer` as `actors[1]`.
    //
    // @param offer_arguments Array of `uint256` that contains `ticket` as `offer_arguments[0]`,
    //                        `nonce` as `offer_arguments[1]`, `amount` as `offer_arguments[2]`, and `reward` as
    //                        `offer_arguments[3]`.
    //
    // @param payment_arguments Array of `uint256` that contains `nonce` as `payment_arguments[0]`, `gasLimit` as
    //                          `payment_arguments[1]` and `gasPrice` as `payment_arguments[2]`.
    //
    function checkDaiPlusOffer(
        address[3] calldata actors,
        uint256[4] calldata offer_arguments,
        uint256[3] calldata payment_arguments,
        bytes calldata signatures
    ) external view {
        // 1. Verify Relayer
        require(actors[2] == msg.sender || actors[2] == address(0), "MMv0::checkDaiPlusOffer | invalid relayer");

        // 2. Verify Nonce
        require(ticket_nonces[offer_arguments[0]] == offer_arguments[1],
            "MMv0::checkDaiPlusOffer | invalid nonce for ticket offer");

        require(signatures.length == 65 * 3, "MMv0::checkDaiPlusOffer | signatures should be 195 bytes long");

        // 3. Verify Dai+ approval
        daiplus.verifyApprove(
            [
            actors[1],
            address(this),
            address(this)
            ],
            [
            payment_arguments[0],
            payment_arguments[1],
            payment_arguments[2],
            0,
            offer_arguments[2] + offer_arguments[3]
            ],
            BytesUtil_v0.slice(signatures, 130, 65)
        );

        bytes memory seller_signature = BytesUtil_v0.slice(signatures, 0, 65);
        bytes memory buyer_signature = BytesUtil_v0.slice(signatures, 65, 65);

        DaiPlusOffer memory daiplusoffer = DaiPlusOffer({
            auction: Auction({
                seller: actors[0],
                buyer: actors[1],
                relayer: actors[2],
                ticket: offer_arguments[0],
                nonce: offer_arguments[1]
                }),
            amount: offer_arguments[2],
            reward: offer_arguments[3]
            });

        address seller_verification = verify(daiplusoffer, seller_signature);
        address buyer_verification = verify(daiplusoffer, buyer_signature);

        // 4. Verify signatures
        require(seller_verification == actors[0], "MMv0::checkDaiPlusOffer | failed seller signature check");
        require(buyer_verification == actors[1], "MMv0::checkDaiPlusOffer | failed buyer signature check");

        // 5. Check ERC721 ownership of the ticket
        require(t721.ownerOf(daiplusoffer.auction.ticket) == daiplusoffer.auction.seller,
            "MMv0::checkDaiPlusOffer | seller is not ticket owner");

    }

    // @notice Seals an exchange of a ticket for DAI+. Two signatures (seller & buyer) are required
    //         to trigger the exchange mechanism.
    //
    // @dev The function MUST throw if nonce is invalid
    //
    // @dev The function MUST throw if signatures are invalid
    //
    // @dev The function MUST throw if buyer hasn't alowed enough Dai to cover payment + reward
    //
    // @dev `seller` is the initial ticket owner (actors[0])
    // @dev `buyer` is the actor purchasing the ticket (actors[1])
    // @dev `ticket` is the id of the sold ticket (offer_arguments[0])
    // @dev `nonce` is the transaction id of the sale (offer_arguments[1])
    // @dev `amount` is the price paid by the buyer to the seller (offer_arguments[2])
    // @dev `reward` is the prive paid by the buyer to the transaction relayer (offer_arguments[3])
    // @dev `nonce` used for the dai+ approval (payment_arguments[0])
    // @dev `nonce` used for the dai+ approval (payment_arguments[0])
    // @dev `gasLimit` used for the dai+ approval (payment_arguments[1])
    // @dev `gasPrice` used for the dai+ approval (payment_arguments[2])
    //
    // @param actors Array of `address`es that contains `seller` as `actors[0]` and `buyer` as `actors[1]`.
    //
    // @param offer_arguments Array of `uint256` that contains `ticket` as `offer_arguments[0]`,
    //                        `nonce` as `offer_arguments[1]`, `amount` as `offer_arguments[2]`, and `reward` as
    //                        `offer_arguments[3]`.
    //
    // @param payment_arguments Array of `uint256` that contains `nonce` as `payment_arguments[0]`, `gasLimit` as
    //                          `payment_arguments[1]` and `gasPrice` as `payment_arguments[2]`.
    //
    function sealDaiPlusOffer(
        address[3] calldata actors,
        uint256[4] calldata offer_arguments,
        uint256[3] calldata payment_arguments,
        bytes calldata signatures
    ) external relayerCheck(actors[2]) ticketNonceCheck(offer_arguments[0], offer_arguments[1]) {

        require(signatures.length == 65 * 3, "MMv0::sealDaiPlusOffer | signatures should be 195 bytes long");

        // 1. Recover Dai+ for redistribution (made soon because a lot of stack is used for this call)
        daiplus.signedApprove(
            [
            actors[1],
            address(this),
            address(this)
            ],
            [
            payment_arguments[0],
            payment_arguments[1],
            payment_arguments[2],
            0,
            offer_arguments[2] + offer_arguments[3]
            ],
            BytesUtil_v0.slice(signatures, 130, 65)
        );

        bytes memory seller_signature = BytesUtil_v0.slice(signatures, 0, 65);
        bytes memory buyer_signature = BytesUtil_v0.slice(signatures, 65, 65);

        DaiPlusOffer memory daiplusoffer = DaiPlusOffer({
            auction: Auction({
                seller: actors[0],
                buyer: actors[1],
                relayer: actors[2],
                ticket: offer_arguments[0],
                nonce: offer_arguments[1]
                }),
            amount: offer_arguments[2],
            reward: offer_arguments[3]
            });

        address seller_verification = verify(daiplusoffer, seller_signature);
        address buyer_verification = verify(daiplusoffer, buyer_signature);

        require(seller_verification == actors[0], "MMv0::sealDaiPlusOffer | failed seller signature check");
        require(buyer_verification == actors[1], "MMv0::sealDaiPlusOffer | failed buyer signature check");

        // 2. Paying Seller. Takes Dai and converts it into Dai+ for seller.
        daiplus.transferFrom(daiplusoffer.auction.buyer, daiplusoffer.auction.seller, daiplusoffer.amount);

        // 3. Transfering Ticket
        t721.transferFrom(daiplusoffer.auction.seller, daiplusoffer.auction.buyer, daiplusoffer.auction.ticket);

        // 4. Paying Reward
        if (daiplusoffer.reward > 0) {
            daiplus.transferFrom(daiplusoffer.auction.buyer, msg.sender, daiplusoffer.reward);
        }

        emit SealedAuction(
            daiplusoffer.auction.buyer,
            daiplusoffer.auction.seller,
            daiplusoffer.auction.ticket,
            address(daiplus),
            daiplusoffer.amount
        );
    }


}

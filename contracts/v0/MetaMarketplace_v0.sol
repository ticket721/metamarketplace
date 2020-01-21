pragma solidity 0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "./MetaMarketplaceDomain_v0.sol";
import "./BytesUtil_v0.sol";
import "./IRefractWallet_v0.sol";

contract MetaMarketplace_v0 is MetaMarketplaceDomain_v0 {

    event SealedOffer(
        address indexed buyer,
        address indexed seller,
        uint256 indexed ticket,
        uint256 nonce,
        bytes currencies,
        bytes prices
    );

    IERC721 public t721;

    mapping (uint256 => uint256) ticket_nonces;

    constructor(uint256 _chainId, address _t721)
    MetaMarketplaceDomain_v0("MetaMarketplace", "0", _chainId) public {
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

    // @notice Utility to verify ERC20 payment parameters
    function verifyPayment(
        address[] memory addr,
        uint256[] memory nums,
        uint256 addr_idx,
        uint256 nums_idx
    ) internal view {

        require(addr.length - addr_idx >= 1, "MMv0::verifyPayment | invalid address argument length");
        require(nums.length - nums_idx >= 1, "MMv0::verifyPayment | invalid nums argument length");

        require(IERC20(addr[addr_idx]).allowance(addr[0], address(this)) >= nums[nums_idx],
            "MMv0::verifyPayment | allowance too low");

    }

    // @notice Utility to verify marketplace offer sealing
    //
    //
    // @param addr Array containing address arguments for the marketplace sealing
    //
    //             ```
    //             | buyer      | > Ticket buyer
    //             | seller     | > Ticket seller
    //             | currency 1 | > First currency used
    //             | currency 2 | > Second currency used
    //             ```
    //
    // @param nums Array containing uint256 arguments for the marketplace sealing
    //
    //             ```
    //             | ticket_id                 | > ID of sold ticket
    //             | nonce                     | > Nonce of marketplace seal
    //             | buyer_mode                | > 1 for normal wallet, 2 for Refract smart wallet
    //             | seller_mode               | > same as above
    //             | currency_count = 2        | > Number of currency used for payment
    //             | currency 1 price          |
    //             | currency 2 price          |
    //             ```
    //
    // @param bdata Contains the signature of a controller, respecting the ERC712 standard, signing an mtx
    //                  data structure type, followed by transaction data.
    //
    //             ```
    //             | buyer_seal_signature         | > EIP712 Signature from the buyer
    //             | seller_seal_signature        | > EIP712 Signature from the seller
    //             ```
    function verifySeal(address[] calldata addr, uint256[] calldata nums, bytes calldata bdata) external view {

        require(addr.length >= 2, "MMv0::verifySeal | invalid address argument length");
        require(nums.length >= 5, "MMv0::verifySeal | invalid nums argument length");
        require(bdata.length >= 130, "MMv0::verifySeal | invalid bdata argument length");

        require(ticket_nonces[nums[0]] == nums[1], "MMv0::verifySeal | invalid offer nonce");

        require(t721.ownerOf(nums[0]) == addr[1], "MMv0::verifySeal | seller is not ticket owner");
        require(addr[1] != addr[0], "MMv0::verifySeal | seller is also buyer");
        require(nums[4] > 0, "MMv0::verifySeal | invalid empty currency count");

        bytes memory currencies = "";
        bytes memory prices = "";

        {
            uint256 nums_idx = 5;
            uint256 addr_idx = 2;
            uint256 bdata_idx = 130;

            for (uint256 idx = 0; idx < nums[4]; ++idx) {

                verifyPayment(addr, nums, addr_idx, nums_idx);
                prices = BytesUtil_v0.concat(prices, BytesUtil_v0.toBytes(nums[nums_idx]));
                currencies = BytesUtil_v0.concat(currencies, BytesUtil_v0.toBytes(addr[addr_idx]));

                nums_idx += 1;
                addr_idx += 1;

            }
        }

        bytes memory buyer_signature = BytesUtil_v0.slice(bdata, 0, 65);
        bytes memory seller_signature = BytesUtil_v0.slice(bdata, 65, 65);
        MarketplaceOffer memory mpo = MarketplaceOffer({
            buyer: addr[0],
            seller: addr[1],
            ticket: nums[0],
            nonce: nums[1],
            currencies: currencies,
            prices: prices
            });

        if (nums[2] == 1) { // Buyer is classic wallet
            require(verify(mpo, buyer_signature) == mpo.buyer, "MMv0::verifySeal | invalid buyer signature");
        } else if (nums[2] == 2) { // Buyer is smart wallet

            address controller = verify(mpo, buyer_signature);
            address payable identity = address(uint160(mpo.buyer));
            require(IRefractWallet_v0(identity).isController(controller) == true,
                "MMv0::verifySeal | invalid buyer controller signature");

        } else {
            revert("MMv0::verifySeal | invalid identity mode for buyer");
        }

        if (nums[3] == 1) { // Seller is classic wallet
            require(verify(mpo, seller_signature) == mpo.seller, "MMv0::verifySeal | invalid seller signature");
        } else if (nums[3] == 2) { // Seller is smart wallet

            address controller = verify(mpo, seller_signature);
            address payable identity = address(uint160(mpo.seller));
            require(IRefractWallet_v0(identity).isController(controller) == true,
                "MMv0::verifySeal | invalid seller controller signature");

        } else {
            revert("MMv0::verifySeal | invalid identity mode for seller");
        }


    }

    // @notice Utility to execute ERC20 payment
    function processPayment(
        address[] memory addr,
        uint256[] memory nums,
        uint256 addr_idx,
        uint256 nums_idx
    ) internal {

        require(addr.length - addr_idx >= 1, "MMv0::processPayment | invalid address argument length");
        require(nums.length - nums_idx >= 1, "MMv0::processPayment | invalid nums argument length");

        IERC20(addr[addr_idx]).transferFrom(addr[0], addr[1], nums[nums_idx]);

    }

    // @notice Executes marketplace sealing
    //
    //
    // @param addr Array containing address arguments for the marketplace sealing
    //
    //             ```
    //             | buyer      | > Ticket buyer
    //             | seller     | > Ticket seller
    //             | currency 1 | > First currency used
    //             | currency 2 | > Second currency used
    //             ```
    //
    // @param nums Array containing uint256 arguments for the marketplace sealing
    //
    //             ```
    //             | ticket_id                 | > ID of sold ticket
    //             | nonce                     | > Nonce of marketplace seal
    //             | buyer_mode                | > 1 for normal wallet, 2 for Refract smart wallet
    //             | seller_mode               | > same as above
    //             | currency_count = 2        | > Number of currency used for payment
    //             | currency 1 price          | /
    //             | currency 2 price          | /
    //             ```
    //
    // @param bdata Contains the signature of a controller, respecting the ERC712 standard, signing an mtx
    //                  data structure type, followed by transaction data.
    //
    //             ```
    //             | buyer_seal_signature         | > EIP712 Signature from the buyer
    //             | seller_seal_signature        | > EIP712 Signature from the seller
    //             ```
    function seal(address[] calldata addr, uint256[] calldata nums, bytes calldata bdata) external {

        require(addr.length >= 2, "MMv0::seal | invalid address argument length");
        require(nums.length >= 5, "MMv0::seal | invalid nums argument length");
        require(bdata.length >= 130, "MMv0::seal | invalid bdata argument length");

        require(ticket_nonces[nums[0]] == nums[1], "MMv0::seal | invalid offer nonce");
        ticket_nonces[nums[0]] += 1;

        require(t721.ownerOf(nums[0]) == addr[1], "MMv0::seal | seller is not ticket owner");
        require(addr[1] != addr[0], "MMv0::seal | seller is also buyer");
        require(nums[4] > 0, "MMv0::seal | invalid empty currency count");

        bytes memory currencies = "";
        bytes memory prices = "";

        {
            uint256 nums_idx = 5;
            uint256 addr_idx = 2;
            uint256 bdata_idx = 130;

            for (uint256 idx = 0; idx < nums[4]; ++idx) {

                processPayment(addr, nums, addr_idx, nums_idx);
                prices = BytesUtil_v0.concat(prices, BytesUtil_v0.toBytes(nums[nums_idx]));
                currencies = BytesUtil_v0.concat(currencies, BytesUtil_v0.toBytes(addr[addr_idx]));

                nums_idx += 1;
                addr_idx += 1;

            }
        }

        bytes memory buyer_signature = BytesUtil_v0.slice(bdata, 0, 65);
        bytes memory seller_signature = BytesUtil_v0.slice(bdata, 65, 65);
        MarketplaceOffer memory mpo = MarketplaceOffer({
            buyer: addr[0],
            seller: addr[1],
            ticket: nums[0],
            nonce: nums[1],
            currencies: currencies,
            prices: prices
            });

        if (nums[2] == 1) { // Buyer is classic wallet
            require(verify(mpo, buyer_signature) == mpo.buyer, "MMv0::seal | invalid buyer signature");
        } else if (nums[2] == 2) { // Buyer is smart wallet

            address controller = verify(mpo, buyer_signature);
            address payable identity = address(uint160(mpo.buyer));
            require(IRefractWallet_v0(identity).isController(controller) == true,
                "MMv0::seal | invalid buyer controller signature");

        } else {
            revert("MMv0::seal | invalid identity mode for buyer");
        }

        if (nums[3] == 1) { // Seller is classic wallet
            require(verify(mpo, seller_signature) == mpo.seller, "MMv0::seal | invalid seller signature");
        } else if (nums[3] == 2) { // Seller is smart wallet

            address controller = verify(mpo, seller_signature);
            address payable identity = address(uint160(mpo.seller));
            require(IRefractWallet_v0(identity).isController(controller) == true,
                "MMv0::seal | invalid seller controller signature");

        } else {
            revert("MMv0::seal | invalid identity mode for seller");
        }

        t721.transferFrom(mpo.seller, mpo.buyer, mpo.ticket);
        emit SealedOffer(mpo.buyer, mpo.seller, mpo.ticket, mpo.nonce, currencies, prices);

    }

}

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { setScopeIndex, CONTRACT_NAME, SCOPE_NAME, CHAIN_ID } = require('../test_cases/constants');

const {erc20_offer} = require('../test_cases/erc20_offer');
const {erc20_offer_smart_wallets} = require('../test_cases/erc20_offer_smart_wallets');
const {seal_invalid_addr_length} = require('../test_cases/seal_invalid_addr_length');
const {seal_invalid_nums_length} = require('../test_cases/seal_invalid_nums_length');
const {seal_invalid_bdata_length} = require('../test_cases/seal_invalid_bdata_length');
const {seal_invalid_nonce} = require('../test_cases/seal_invalid_nonce');
const {seal_invalid_ticket_owner} = require('../test_cases/seal_invalid_ticket_owner');
const {seal_seller_is_buyer} = require('../test_cases/seal_seller_is_buyer');
const {seal_invalid_currency_count} = require('../test_cases/seal_invalid_currency_count');
const {seal_invalid_erc20_addr_length} = require('../test_cases/seal_invalid_erc20_addr_length');
const {seal_invalid_erc20_nums_length} = require('../test_cases/seal_invalid_erc20_nums_length');
const {seal_erc20_allowance_too_low} = require('../test_cases/seal_erc20_allowance_too_low');
const {seal_invalid_buyer_signature} = require('../test_cases/seal_invalid_buyer_signature');
const {seal_invalid_seller_signature} = require('../test_cases/seal_invalid_seller_signature');
const {seal_invalid_buyer_mode} = require('../test_cases/seal_invalid_buyer_mode');
const {seal_invalid_seller_mode} = require('../test_cases/seal_invalid_seller_mode');

contract('metamarketplace', (accounts) => {

    before(async function () {
        const ERC20MockArtifact = artifacts.require('ERC20Mock_v0');
        const DaiMockArtifact = artifacts.require('DaiMock_v0');
        const ERC721MockArtifact = artifacts.require('ERC721Mock_v0');
        const SmartWalletMockArtifact = artifacts.require('SmartWalletMock_v0');
        const MetaMarketplaceArtifact = artifacts.require(CONTRACT_NAME);

        const ERC20Instance = await ERC20MockArtifact.deployed();
        const DaiInstance = await DaiMockArtifact.deployed();
        const ERC721Instance = await ERC721MockArtifact.deployed();
        const MetaMarketplaceInstance = await MetaMarketplaceArtifact.deployed();

        await ERC721Instance.createScope(SCOPE_NAME, '0x0000000000000000000000000000000000000000', [MetaMarketplaceInstance.address], []);
        const scope = await ERC721Instance.getScope(SCOPE_NAME);
        setScopeIndex(scope.scope_index.toNumber());

        this.contracts = {
            [CONTRACT_NAME]: MetaMarketplaceInstance,
            ERC20: ERC20Instance,
            Dai: DaiInstance,
            ERC721: ERC721Instance,
            SmartWalletMockArtifact: SmartWalletMockArtifact
        };

        this.snap_id = await snapshot();
        this.accounts = accounts;
        this.expect = expect;
        this.network_id = await web3.eth.net.getId();
    });

    beforeEach(async function () {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    describe('MarketplaceOffer', function () {

        it('erc20 offer', erc20_offer);
        it('erc20 offer smart wallet', erc20_offer_smart_wallets);
        it('seal invalid addr length', seal_invalid_addr_length);
        it('seal invalid nums length', seal_invalid_nums_length);
        it('seal invalid bdata length', seal_invalid_bdata_length);
        it('seal invalid nonce', seal_invalid_nonce);
        it('seal invalid ticket owner', seal_invalid_ticket_owner);
        it('seal seller is buyer', seal_seller_is_buyer);
        it('seal invalid currency count', seal_invalid_currency_count);
        it('seal invalid erc20 addr length', seal_invalid_erc20_addr_length);
        it('seal invalid erc20 nums length', seal_invalid_erc20_nums_length);
        it('seal erc20 allowance too low', seal_erc20_allowance_too_low);
        it('seal invalid buyer signature', seal_invalid_buyer_signature);
        it('seal invalid seller signature', seal_invalid_seller_signature);
        it('seal invalid buyer mode', seal_invalid_buyer_mode);
        it('seal invalid seller mode', seal_invalid_seller_mode);

    });

});

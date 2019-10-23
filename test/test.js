const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const { setScopeIndex, CONTRACT_NAME, SCOPE_NAME } = require('../test_cases/constants');

const { daioffer } = require('../test_cases/DaiOffer');
const { daioffer_no_reward } = require('../test_cases/DaiOffer_no_reward');
const { daioffer_invalid_signature } = require('../test_cases/DaiOffer_invalid_signature');
const { daioffer_invalid_seller_signature } = require('../test_cases/DaiOffer_invalid_seller_signature');
const { daioffer_invalid_buyer_signature } = require('../test_cases/DaiOffer_invalid_buyer_signature');
const { daioffer_invalid_nonce } = require('../test_cases/DaiOffer_invalid_nonce');
const { daioffer_allowance_too_low } = require('../test_cases/DaiOffer_allowance_too_low');
const { daioffer_invalid_ticket_owner } = require('../test_cases/DaiOffer_invalid_ticket_owner');
const { daioffer_no_relayer_restriction } = require('../test_cases/DaiOffer_no_relayer_restriction');
const { daioffer_invalid_relayer } = require('../test_cases/DaiOffer_invalid_relayer');

const { daiplusoffer } = require('../test_cases/DaiPlusOffer');
const { daiplusoffer_allowance_too_low } = require('../test_cases/DaiPlusOffer_allowance_too_low');
const { daiplusoffer_invalid_buyer_signature } = require('../test_cases/DaiPlusOffer_invalid_buyer_signature');
const { daiplusoffer_invalid_seller_signature } = require('../test_cases/DaiPlusOffer_invalid_seller_signature');
const { daiplusoffer_invalid_signature } = require('../test_cases/DaiPlusOffer_invalid_signature');
const { daiplusoffer_invalid_nonce } = require('../test_cases/DaiPlusOffer_invalid_nonce');
const { daiplusoffer_invalid_relayer } = require('../test_cases/DaiPlusOffer_invalid_relayer');
const { daiplusoffer_invalid_ticket_owner } = require('../test_cases/DaiPlusOffer_invalid_ticket_owner');
const { daiplusoffer_no_relayer_restriction } = require('../test_cases/DaiPlusOffer_no_relayer_restriction');
const { daiplusoffer_no_reward } = require('../test_cases/DaiPlusOffer_no_reward');

contract('metamarketplace', (accounts) => {

    before(async function () {
        const MetaMarketplaceArtifact = artifacts.require(CONTRACT_NAME);
        const MetaMarketplaceInstance = await MetaMarketplaceArtifact.new();

        const ERC20MockArtifact = artifacts.require('ERC20Mock');
        const ERC2280MockArtifact = artifacts.require('ERC2280Mock');
        const ERC721MockArtifact = artifacts.require('ERC721Mock');

        const ERC20Instance = await ERC20MockArtifact.new();
        const ERC2280Instance = await ERC2280MockArtifact.new(ERC20Instance.address);
        const ERC721Instance = await ERC721MockArtifact.new();

        await ERC721Instance.createScope(SCOPE_NAME, '0x0000000000000000000000000000000000000000', [MetaMarketplaceInstance.address], []);
        const scope = await ERC721Instance.getScope(SCOPE_NAME);
        setScopeIndex(scope.scope_index.toNumber());

        this.contracts = {
            [CONTRACT_NAME]: MetaMarketplaceInstance,
            ERC20: ERC20Instance,
            ERC2280: ERC2280Instance,
            ERC721: ERC721Instance
        };

        this.snap_id = await snapshot();
        this.accounts = accounts;
        this.expect = expect;
    });

    beforeEach(async function () {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    describe('DaiOffer', function () {

        it('100 Dai for 1 Ticket (100 Dai reward)', daioffer);
        it('100 Dai for 1 Ticket (0 Dai reward)', daioffer_no_reward);
        it('invalid signature (128 length)', daioffer_invalid_signature);
        it('invalid seller signature', daioffer_invalid_seller_signature);
        it('invalid buyer signature', daioffer_invalid_buyer_signature);
        it('invalid nonce', daioffer_invalid_nonce);
        it('allowance too low (amount + reward - 1)', daioffer_allowance_too_low);
        it('invalid ticket owner', daioffer_invalid_ticket_owner);
        it('no relayer restriction', daioffer_no_relayer_restriction);
        it('invalid relayer', daioffer_invalid_relayer);

    });

    describe('DaiPlusOffer', function () {

        it('100 Dai for 1 Ticket (100 Dai reward)', daiplusoffer);
        it('100 Dai for 1 Ticket (0 Dai reward)', daiplusoffer_no_reward);
        it('invalid signature (193 length)', daiplusoffer_invalid_signature);
        it('invalid seller signature', daiplusoffer_invalid_seller_signature);
        it('invalid buyer signature', daiplusoffer_invalid_buyer_signature);
        it('invalid nonce', daiplusoffer_invalid_nonce);
        it('allowance too low (amount + reward - 1)', daiplusoffer_allowance_too_low);
        it('invalid ticket owner', daiplusoffer_invalid_ticket_owner);
        it('no relayer restriction', daiplusoffer_no_relayer_restriction);
        it('invalid relayer', daiplusoffer_invalid_relayer);

    });

});

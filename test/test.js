const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const { revert, snapshot } = require('../test_cases/utils');
chai.use(chaiAsPromised);
const expect = chai.expect;

const contract_name = 'MetaMarketplace_v0';

contract('metamarketplace', (accounts) => {

    before(async function () {
        const MetaMarketplaceArtifact = artifacts.require(contract_name);
        const MetaMarketplaceInstance = await MetaMarketplaceArtifact.new();

        this.contracts = {
            [contract_name]: MetaMarketplaceInstance
        };

        this.snap_id = await snapshot();
    });

    beforeEach(async function () {
        const status = await revert(this.snap_id);
        expect(status).to.be.true;
        this.snap_id = await snapshot();
    });

    it('is a basic placholder test', async function() {
        const MetaMarketplace = this.contracts[contract_name];
        await MetaMarketplace.initialize();

        return expect(MetaMarketplace.test()).to.eventually.equal('salut');
    })

});

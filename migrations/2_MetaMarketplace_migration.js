const config = require('../truffle-config');
const MetaMarketplace_v0 = artifacts.require("MetaMarketplace_v0");
const ERC20Mock_v0 = artifacts.require("ERC20Mock_v0");
const ERC721Mock_v0 = artifacts.require("ERC721Mock_v0");
const ERC2280Mock_v0 = artifacts.require("ERC2280Mock_v0");

const hasArtifact = (name) => {
    return (config && config.artifacts
        && config.artifacts[name]);
};

const getArtifact = (name) => {
    return config.artifacts[name];
}

module.exports = async function(deployer, networkName, accounts) {
    if (['test', 'soliditycoverage'].indexOf(networkName) === -1) {

        if (hasArtifact('daiplus') && hasArtifact('ticketforge')) {
            const network_id = await web3.eth.net.getId();

            const DaiPlusArtifact = getArtifact('daiplus').DaiPlus;
            const DaiPlus = new web3.eth.Contract(DaiPlusArtifact.abi, DaiPlusArtifact.networks[network_id].address);
            const DaiAddress = await DaiPlus.methods.backer().call();
            const DaiPlusAddress = DaiPlusArtifact.networks[network_id].address;

            const TicketforgeArtifact = getArtifact('ticketforge').TicketForge;
            const TicketForgeAddress = TicketforgeArtifact.networks[network_id].address;

            console.log(`Dai Address: ${DaiAddress}`);
            console.log(`Dai+ Address: ${DaiPlusAddress}`);
            console.log(`T721 Address: ${TicketForgeAddress}`);

            await deployer.deploy(MetaMarketplace_v0, network_id, DaiAddress, DaiPlusAddress, TicketForgeAddress);

        } else {
            throw new Error('Deployment requires Ticket721 repo setup to inject daiplus & ticketforge configuration');
        }

    } else {

        const network_id = await web3.eth.net.getId();

        await deployer.deploy(ERC20Mock_v0);
        const ERC20Instance = await ERC20Mock_v0.deployed();

        await deployer.deploy(ERC2280Mock_v0, ERC20Instance.address);
        const ERC2280Instance = await ERC2280Mock_v0.deployed();

        await deployer.deploy(ERC721Mock_v0);
        const ERC721Instance = await ERC721Mock_v0.deployed();

        await deployer.deploy(MetaMarketplace_v0, network_id, ERC20Instance.address, ERC2280Instance.address, ERC721Instance.address);

    }
};


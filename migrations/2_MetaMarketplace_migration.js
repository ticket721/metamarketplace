const { scripts, ConfigManager } = require('@openzeppelin/cli');
const { add, push, create } = scripts;
const config = require('../truffle-config');

const hasArtifact = (name) => {
    return (config && config.extra_config && config.extra_config.external_modules
        && config.extra_config.external_modules[name] && config.extra_config.external_modules[name].artifact);
};

const getArtifact = (name) => {
    return config.extra_config.external_modules[name].artifact;
}

async function deploy(options) {

    add({ contractsData: [{ name: 'MetaMarketplace_v0', alias: 'MetaMarketplace' }] });

    await push(options);

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

        await create(Object.assign({ contractAlias: 'MetaMarketplace', methodName: 'initialize_v0', methodArgs: [network_id, DaiAddress, DaiPlusAddress, TicketForgeAddress] }, options));

    } else {
        throw new Error('Deployment requires Ticket721 repo setup to inject daiplus & ticketforge configuration');
    }

}

module.exports = async function(deployer, networkName, accounts) {
    if (['test', 'soliditycoverage'].indexOf(networkName) === -1) {

        await deployer.then(async () => {
            const {network, txParams} = await ConfigManager.initNetworkConfiguration({
                network: networkName,
                from: accounts[1]
            });
            await deploy({network, txParams});
        })

    }
};


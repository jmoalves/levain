Levain
[![Github Created At](https://img.shields.io/github/created-at/jmoalves/levain)](https://github.com/jmoalves/levain)
[![Release](https://img.shields.io/github/v/release/jmoalves/levain)![GitHub Release Date](https://img.shields.io/github/release-date/jmoalves/levain?display_date=published_at&label=%20)](https://github.com/jmoalves/levain/releases/latest)
======
[![Check sources](https://github.com/jmoalves/levain/actions/workflows/checkSources.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/checkSources.yml)
[![Unit tests](https://github.com/jmoalves/levain/actions/workflows/test-unit.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/test-unit.yml)
[![codecov](https://codecov.io/gh/jmoalves/levain/graph/badge.svg?token=24E0G0XZNF)](https://codecov.io/gh/jmoalves/levain)
[![Test - e2e](https://github.com/jmoalves/levain/actions/workflows/test-e2e.yml/badge.svg)](https://github.com/jmoalves/levain/actions/workflows/test-e2e.yml)



Something to help you make your software grow

## Installing Levain

We recomend you to use the latest version of `install.ps1` script.   
You can combine the options below.

### Install latest release at $HOME/levain
```powershell
iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

### Install a specific Levain version
```powershell
$levainVersion="0.90.4";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

### Choose another destination directory
```powershell
$levainHome="C:\dev-env";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

### Providing your own Levain mirror (using Nexus, for instance)
```powershell
$levainUrlBase="http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain";iwr http://nexus.local.net/nexus/repository/github-proxy/jmoalves/levain/releases/latest/download/install.ps1 | iex
```

### Providing you own recipes repository
```powershell
$levainRepo="https://gitlab.local.net/grp-dev/levain-pkgs.git";iwr https://github.com/jmoalves/levain/releases/latest/download/install.ps1 | iex`
```

----

## Some use cases

### Listing available packages / recipes
`levain list`   
`levain list jdk`

### Installing some packages
`levain install jdk-21-ibm git wlp-runtime-24.0.0.1`

### Open a configured shell
`levain shell`   
`levain shell wlp-runtime-24.0.0.1 jdk-21-ibm`

# ═══════════════════════════════════════════════════════════════════
#  Environment
# ═══════════════════════════════════════════════════════════════════
$env:EDITOR = "nvim"
$_dotfilesEnv = Join-Path $HOME ".config\powershell\env.ps1"
if (Test-Path $_dotfilesEnv) {
    . $_dotfilesEnv
}
Remove-Variable _dotfilesEnv -ErrorAction SilentlyContinue

# ═══════════════════════════════════════════════════════════════════
#  Module bootstrap (auto-install on first run)
# ═══════════════════════════════════════════════════════════════════
$_requiredModules = @('PSReadLine')
foreach ($mod in $_requiredModules) {
    if (-not (Get-Module -ListAvailable $mod)) {
        Install-Module $mod -Force -SkipPublisherCheck -Scope CurrentUser
    }
}

# ═══════════════════════════════════════════════════════════════════
#  PSReadLine
# ═══════════════════════════════════════════════════════════════════
Set-PSReadLineOption -EditMode Emacs
Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineKeyHandler -Key UpArrow   -Function HistorySearchBackward
Set-PSReadLineKeyHandler -Key DownArrow -Function HistorySearchForward
Set-PSReadLineKeyHandler -Key Tab       -Function MenuComplete

# ═══════════════════════════════════════════════════════════════════
#  Aliases
# ═══════════════════════════════════════════════════════════════════
if (Get-Command eza -ErrorAction SilentlyContinue) {
    Remove-Item Alias:ls -Force -ErrorAction SilentlyContinue
    function ls   { eza --long --header --sort=type --git @args }
    function ll   { eza --long --header --sort=type --git -alh @args }
    function tree { eza --tree --level 3 --git @args }
}

# ═══════════════════════════════════════════════════════════════════
#  Tool integrations (dynamic — only activates if installed)
# ═══════════════════════════════════════════════════════════════════
if (Get-Command mise -ErrorAction SilentlyContinue) {
    & mise activate pwsh | Out-String | Invoke-Expression
}

if (Get-Command starship -ErrorAction SilentlyContinue) {
    Invoke-Expression (&starship init powershell)
}

if (Get-Command fzf -ErrorAction SilentlyContinue) {
    Set-PSReadLineKeyHandler -Key 'Ctrl+r' -BriefDescription 'fzf-history' -Description 'Search history with fzf' -ScriptBlock {
        $line = $null; $cursor = $null
        [Microsoft.PowerShell.PSConsoleReadLine]::GetBufferState([ref]$line, [ref]$cursor)
        $result = Get-Content (Get-PSReadLineOption).HistorySavePath |
            Select-Object -Unique |
            & fzf --tac --query "$line" --height 40% --layout reverse
        if ($result) {
            [Microsoft.PowerShell.PSConsoleReadLine]::RevertLine()
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert($result)
        }
    }

    Set-PSReadLineKeyHandler -Key 'Ctrl+t' -BriefDescription 'fzf-file' -Description 'Insert file path with fzf' -ScriptBlock {
        $result = & fzf --height 40% --layout reverse
        if ($result) {
            [Microsoft.PowerShell.PSConsoleReadLine]::Insert($result)
        }
    }

    Set-PSReadLineKeyHandler -Key 'Alt+c' -BriefDescription 'fzf-cd' -Description 'Change directory with fzf' -ScriptBlock {
        $cmd = if (Get-Command fd -ErrorAction SilentlyContinue) { 'fd --type d --hidden --exclude .git' } else { 'Get-ChildItem -Recurse -Directory -Name' }
        $result = Invoke-Expression $cmd | & fzf --height 40% --layout reverse
        if ($result) {
            Set-Location $result
            [Microsoft.PowerShell.PSConsoleReadLine]::InvokePrompt()
        }
    }
}

if (Get-Command kubectl -ErrorAction SilentlyContinue) {
    kubectl completion powershell | Out-String | Invoke-Expression
}

if (Get-Command helm -ErrorAction SilentlyContinue) {
    helm completion powershell | Out-String | Invoke-Expression
}
